const { network, ethers } = require("hardhat")
const {
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
} = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    if (chainId == 31337) {
        const achiever = await ethers.getContract("Achiever")
        achieverAddress = achiever.address
    } else {
        achieverAddress = networkConfig[chainId]["achiever"]
    }

    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS

    log("----------------------------------------------------")
    const args = [
        achieverAddress,
        "SNOWMAN",
        "SWM",
        "ipfs://QmYazBwpf7Xr2K5ETsqNJiXVm3oy8cPSmMCeger4jBhptA/",
    ]
    const basicNFT = await deploy("BasicNFT", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: waitBlockConfirmations,
    })

    // Verify the deployment
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(basicNFT.address, args)
    }
    log("----------------------------------------------------")
}

module.exports.tags = ["all", "basicnft"]
