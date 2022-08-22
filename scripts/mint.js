const { ethers, network } = require("hardhat")
const { moveBlocks } = require("../utils/move-blocks")

const PRICE = ethers.utils.parseEther("0.01")
const AIRDROP = ethers.utils.parseEther("10000")

async function mintAndList() {
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
    const tokenID = await basicNFT.connect(user).walletOfOwner(user.address)
    console.log(`Minted tokenId ${tokenID} from contract: ${basicNFT.address}`)
    if (network.config.chainId == 31337) {
        // Moralis has a hard time if you move more than 1 block!
        await moveBlocks(2, (sleepAmount = 1000))
    }
}

mintAndList()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
