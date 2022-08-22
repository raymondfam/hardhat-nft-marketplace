const { ethers, network } = require("hardhat")
const { moveBlocks } = require("../utils/move-blocks")

const PRICE = ethers.utils.parseEther("0.01")
const AIRDROP = ethers.utils.parseEther("10000")
const TOKEN_ID = 1

async function buyItem() {
    accounts = await ethers.getSigners() // could also do with getNamedAccounts
    deployer = accounts[0]
    user = accounts[1]
    await deployments.fixture(["all"])
    nftExchangeContract = await ethers.getContract("NFTExchange")
    nftExchange = nftExchangeContract.connect(deployer)
    basicNFTContract = await ethers.getContract("BasicNFT")
    basicNFT = await basicNFTContract.connect(deployer)
    achieverContract = await ethers.getContract("Achiever")
    achiever = await achieverContract.connect(deployer)
    await basicNFT.setPaused(false)
    await achiever.mint(user.address, AIRDROP)
    await achiever.connect(user).approve(basicNFT.address, PRICE)
    console.log("Minting NFT...")
    await basicNFT.connect(user).mint(1, PRICE)
    console.log("Approving NFT...")
    const approvalTx = await basicNFT.connect(user).approve(nftExchange.address, TOKEN_ID)
    await approvalTx.wait(1)
    console.log("Listing NFT...")
    const tx = await nftExchange.connect(user).listItem(basicNFT.address, TOKEN_ID, PRICE)
    await tx.wait(1)
    console.log("NFT Listed!")
    const listing = await nftExchange.getListing(basicNFT.address, TOKEN_ID)
    const price = listing.price.toString()
    const tx1 = await nftExchange.buyItem(basicNFT.address, TOKEN_ID, { value: price })
    await tx1.wait(1)
    console.log("NFT Bought!")
    if ((network.config.chainId = "31337")) {
        await moveBlocks(2, (sleepAmount = 1000))
    }
}

buyItem()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
