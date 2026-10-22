import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect } from "chai";
import { ethers } from "hardhat";

const PLANCK = 10_000n;
const DEPOSIT = 1_000_000_000_000_000_000n;
const ROYALTY = 100_000_000_000_000_000n;

function leaf(fingerprint: string, author: string, royalty: bigint): string {
  return ethers.solidityPackedKeccak256(["bytes32", "address", "uint256"], [fingerprint, author, royalty]);
}

function hashPair(a: string, b: string): string {
  const [left, right] = a.toLowerCase() < b.toLowerCase() ? [a, b] : [b, a];
  return ethers.keccak256(ethers.concat([left, right]));
}

function buildRoot(leaves: string[]): string {
  let level = leaves.slice();
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 === level.length) next.push(level[i]);
      else next.push(hashPair(level[i], level[i + 1]));
    }
    level = next;
  }
  return level[0];
}

function buildProof(leaves: string[], index: number): string[] {
  let level = leaves.slice();
  let cursor = index;
  const proof: string[] = [];
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 === level.length) next.push(level[i]);
      else next.push(hashPair(level[i], level[i + 1]));
    }
    const sibling = cursor ^ 1;
    if (sibling < level.length) proof.push(level[sibling]);
    cursor = Math.floor(cursor / 2);
    level = next;
  }
  return proof;
}

async function deploy() {
  const factory = await ethers.getContractFactory("Provenant");
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  return contract;
}

describe("Provenant", () => {
  const fingerprint = (n: number) => ethers.zeroPadValue(ethers.toBeHex(n), 32);
  const manifest = ethers.id("provenant-manifest");

  it("pays the named author from the deposit and refuses everyone else", async () => {
    const [author, lab, stranger] = await ethers.getSigners();
    const contract = await deploy();
    const prints = [fingerprint(1), fingerprint(2), fingerprint(3)];
    const leaves = prints.map((item) => leaf(item, author.address, ROYALTY));
    const root = buildRoot(leaves);

    const tx = await contract.connect(lab).registerDataset(root, manifest, { value: DEPOSIT });
    await expect(tx).to.emit(contract, "DatasetRegistered").withArgs(1n, lab.address, root, manifest, DEPOSIT);
    expect(await contract.nextId()).to.equal(1n);

    const before = await ethers.provider.getBalance(author.address);
    const claim = await contract.connect(author).claim(1, prints[1], ROYALTY, buildProof(leaves, 1));
    const receipt = await claim.wait();
    await expect(claim).to.emit(contract, "RoyaltyPaid").withArgs(1n, prints[1], author.address, ROYALTY);
    const after = await ethers.provider.getBalance(author.address);
    const gas = receipt!.gasUsed * receipt!.gasPrice;
    expect(after - before + gas).to.equal(ROYALTY);

    const stored = await contract.dataset(1);
    expect(stored.claimed).to.equal(ROYALTY);
    expect(await contract.claimedLeaf(1, leaves[1])).to.equal(true);

    await expect(contract.connect(author).claim(1, prints[1], ROYALTY, buildProof(leaves, 1))).to.be.revertedWithCustomError(
      contract,
      "AlreadyClaimed",
    );
    await expect(contract.connect(stranger).claim(1, prints[0], ROYALTY, buildProof(leaves, 0))).to.be.revertedWithCustomError(
      contract,
      "BadProof",
    );
    await expect(contract.connect(author).claim(1, fingerprint(9), ROYALTY, [])).to.be.revertedWithCustomError(
      contract,
      "BadProof",
    );
  });

  it("accepts the @provenant/core sample market and a single-leaf tree", async () => {
    const core = await import("@provenant/core");
    const [author, lab] = await ethers.getSigners();
    expect(author.address).to.equal(core.DEMO_AUTHOR);
    const market = core.sampleMarket();
    const contract = await deploy();
    const hash = core.manifestHash({
      version: 1,
      licence: market.licence,
      model: market.model,
      lab: lab.address as `0x${string}`,
      root: market.root,
      works: market.trained.map((work) => ({
        id: work.id,
        title: work.title,
        fingerprint: work.fingerprint,
        author: work.author,
        royalty: work.royalty.toString(),
        chunkCount: work.chunkCount,
      })),
    });
    await contract.connect(lab).registerDataset(market.root, hash, { value: market.deposit });
    for (const work of market.trained) {
      const proof = core.proofFor(market, work.fingerprint);
      expect(proof).to.not.equal(null);
      await contract.connect(author).claim(1, work.fingerprint, proof!.royalty, proof!.proof);
    }
    expect((await contract.dataset(1)).claimed).to.equal(market.royaltyEach * 2n);
    const held = market.heldOut.fingerprint;
    await expect(contract.connect(author).claim(1, held, market.royaltyEach, [])).to.be.revertedWithCustomError(
      contract,
      "BadProof",
    );

    const single = leaf(fingerprint(7), author.address, ROYALTY);
    await contract.connect(lab).registerDataset(single, manifest, { value: ROYALTY });
    await contract.connect(author).claim(2, fingerprint(7), ROYALTY, []);
    expect((await contract.dataset(2)).claimed).to.equal(ROYALTY);
  });

  it("refunds the unclaimed deposit only to the lab", async () => {
    const [author, lab, stranger] = await ethers.getSigners();
    const contract = await deploy();
    const single = leaf(fingerprint(4), author.address, ROYALTY);
    await contract.connect(lab).registerDataset(single, manifest, { value: DEPOSIT });
    await contract.connect(author).claim(1, fingerprint(4), ROYALTY, []);
    await expect(contract.connect(stranger).close(1)).to.be.revertedWithCustomError(contract, "NotLab");
    const before = await ethers.provider.getBalance(lab.address);
    const close = await contract.connect(lab).close(1);
    const receipt = await close.wait();
    const gas = receipt!.gasUsed * receipt!.gasPrice;
    const after = await ethers.provider.getBalance(lab.address);
    expect(after - before + gas).to.equal(DEPOSIT - ROYALTY);
    await expect(contract.connect(author).claim(1, fingerprint(4), ROYALTY, [])).to.be.revertedWithCustomError(
      contract,
      "UnknownDataset",
    );
  });

  it("rejects empty roots, non-planck value, and royalties the deposit cannot cover", async () => {
    const [author, lab] = await ethers.getSigners();
    const contract = await deploy();
    await expect(contract.connect(lab).registerDataset(ethers.ZeroHash, manifest, { value: DEPOSIT })).to.be.revertedWithCustomError(
      contract,
      "EmptyRoot",
    );
    const root = leaf(fingerprint(1), author.address, ROYALTY);
    await expect(contract.connect(lab).registerDataset(root, manifest, { value: PLANCK - 1n })).to.be.revertedWithCustomError(
      contract,
      "BadDeposit",
    );
    await expect(contract.connect(lab).registerDataset(root, manifest, { value: 0 })).to.be.revertedWithCustomError(
      contract,
      "BadDeposit",
    );
    await contract.connect(lab).registerDataset(root, manifest, { value: ROYALTY });
    await expect(contract.connect(author).claim(1, fingerprint(1), ROYALTY + PLANCK, [])).to.be.revertedWithCustomError(
      contract,
      "BadProof",
    );
    await expect(contract.connect(author).claim(1, fingerprint(1), ROYALTY * 2n, [])).to.be.revertedWithCustomError(
      contract,
      "BadProof",
    );
    await contract.connect(lab).registerDataset(leaf(fingerprint(8), author.address, DEPOSIT), manifest, { value: ROYALTY });
    await expect(contract.connect(author).claim(2, fingerprint(8), DEPOSIT, [])).to.be.revertedWithCustomError(
      contract,
      "BadRoyalty",
    );
  });

  it("keeps Provenant free of BLOCK and CREATE opcodes and small enough to deposit", async () => {
    const core = await import("@provenant/core");
    const artifact = JSON.parse(readFileSync(join(__dirname, "../artifacts/contracts/Provenant.sol/Provenant.json"), "utf8")) as {
      deployedBytecode: string;
    };
    const probe = JSON.parse(readFileSync(join(__dirname, "../artifacts/contracts/OpcodeProbe.sol/OpcodeProbe.json"), "utf8")) as {
      deployedBytecode: string;
    };
    const proven = core.scanBytecode(artifact.deployedBytecode);
    const probed = core.scanBytecode(probe.deployedBytecode);
    expect(proven.block, JSON.stringify(proven.block)).to.deep.equal([]);
    expect(proven.create).to.deep.equal([]);
    expect(probed.block.map((hit: { name: string }) => hit.name)).to.include.members(["TIMESTAMP", "CHAINID"]);
    const bytes = (artifact.deployedBytecode.length - 2) / 2;
    console.log(`Provenant runtime bytecode: ${bytes} bytes`);
    expect(bytes).to.be.lessThan(8_192);
    const source = readFileSync(join(__dirname, "../contracts/Provenant.sol"), "utf8");
    expect(source).to.not.match(/block\.(timestamp|chainid|number|coinbase)/);
  });
});
