const { network } = require("hardhat")
const { VERIFICATION_BLOCK_CONFIRMATIONS, developmentChains } = require("../helper-hardhat-config")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS
    log("----------------------------------------------------")

    if (developmentChains.includes(network.name)) {
        const args = []
        const achiever = await deploy("Achiever", {
            from: deployer,
            args: args,
            log: true,
            waitConfirmations: waitBlockConfirmations,
        })
    }
}

module.exports.tags = ["all", "achiever"]
