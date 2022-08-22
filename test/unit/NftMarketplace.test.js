const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Nft Marketplace Unit Tests", function () {
          let nftExchange, nftExchangeContract, basicNFT, basicNFTContract
          const PRICE = ethers.utils.parseEther("0.1")
          const TOKEN_ID = 1

          beforeEach(async () => {
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
              await achiever.mint(deployer.address, ethers.utils.parseEther("0.01"))
              await achiever.approve(basicNFT.address, ethers.utils.parseEther("0.01"))
              await basicNFT.setPaused(false)
              await basicNFT.mint(1, ethers.utils.parseEther("0.01"))
              await basicNFT.approve(nftExchangeContract.address, TOKEN_ID)
          })

          describe("listItem", function () {
              it("emits an event after listing an item", async function () {
                  expect(await nftExchange.listItem(basicNFT.address, TOKEN_ID, PRICE)).to.emit(
                      "ItemListed"
                  )
              })
              it("exclusively lists items that haven't been listed", async function () {
                  await nftExchange.listItem(basicNFT.address, TOKEN_ID, PRICE)
                  const error = `AlreadyListed("${basicNFT.address}", ${TOKEN_ID})`
                  //   await expect(
                  //       nftExchange.listItem(basicNFT.address, TOKEN_ID, PRICE)
                  //   ).to.be.revertedWith("AlreadyListed")
                  await expect(
                      nftExchange.listItem(basicNFT.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith(error)
              })
              it("exclusively allows owners to list", async function () {
                  nftExchange = nftExchangeContract.connect(user)
                  await basicNFT.approve(user.address, TOKEN_ID)
                  await expect(
                      nftExchange.listItem(basicNFT.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NotOwner")
              })
              it("needs approvals to list item", async function () {
                  await basicNFT.approve(ethers.constants.AddressZero, TOKEN_ID)
                  await expect(
                      nftExchange.listItem(basicNFT.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NotApprovedForMarketplace")
              })
              it("Updates listing with seller and price", async function () {
                  await nftExchange.listItem(basicNFT.address, TOKEN_ID, PRICE)
                  const listing = await nftExchange.getListing(basicNFT.address, TOKEN_ID)
                  assert(listing.price.toString() == PRICE.toString())
                  assert(listing.seller.toString() == deployer.address)
              })
          })
          describe("cancelListing", function () {
              it("reverts if there is no listing", async function () {
                  const error = `NotListed("${basicNFT.address}", ${TOKEN_ID})`
                  await expect(
                      nftExchange.cancelListing(basicNFT.address, TOKEN_ID)
                  ).to.be.revertedWith(error)
              })
              it("reverts if anyone but the owner tries to call", async function () {
                  await nftExchange.listItem(basicNFT.address, TOKEN_ID, PRICE)
                  nftExchange = nftExchangeContract.connect(user)
                  await basicNFT.approve(user.address, TOKEN_ID)
                  await expect(
                      nftExchange.cancelListing(basicNFT.address, TOKEN_ID)
                  ).to.be.revertedWith("NotOwner")
              })
              it("emits event and removes listing", async function () {
                  await nftExchange.listItem(basicNFT.address, TOKEN_ID, PRICE)
                  expect(await nftExchange.cancelListing(basicNFT.address, TOKEN_ID)).to.emit(
                      "ItemCanceled"
                  )
                  const listing = await nftExchange.getListing(basicNFT.address, TOKEN_ID)
                  assert(listing.price.toString() == "0")
              })
          })
          describe("buyItem", function () {
              it("reverts if the item isnt listed", async function () {
                  await expect(nftExchange.buyItem(basicNFT.address, TOKEN_ID)).to.be.revertedWith(
                      "NotListed"
                  )
              })
              it("reverts if the price isnt met", async function () {
                  await nftExchange.listItem(basicNFT.address, TOKEN_ID, PRICE)
                  await expect(nftExchange.buyItem(basicNFT.address, TOKEN_ID)).to.be.revertedWith(
                      "PriceNotMet"
                  )
              })
              it("transfers the nft to the buyer and updates internal proceeds record", async function () {
                  await nftExchange.listItem(basicNFT.address, TOKEN_ID, PRICE)
                  nftExchange = nftExchangeContract.connect(user)
                  expect(
                      await nftExchange.buyItem(basicNFT.address, TOKEN_ID, { value: PRICE })
                  ).to.emit("ItemBought")
                  const newOwner = await basicNFT.ownerOf(TOKEN_ID)
                  const deployerProceeds = await nftExchange.getProceeds(deployer.address)
                  assert(newOwner.toString() == user.address)
                  assert(deployerProceeds.toString() == PRICE.toString())
              })
          })
          describe("updateListing", function () {
              it("must be owner and listed", async function () {
                  await expect(
                      nftExchange.updateListing(basicNFT.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NotListed")
                  await nftExchange.listItem(basicNFT.address, TOKEN_ID, PRICE)
                  nftExchange = nftExchangeContract.connect(user)
                  await expect(
                      nftExchange.updateListing(basicNFT.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NotOwner")
              })
              it("updates the price of the item", async function () {
                  const updatedPrice = ethers.utils.parseEther("0.2")
                  await nftExchange.listItem(basicNFT.address, TOKEN_ID, PRICE)
                  expect(
                      await nftExchange.updateListing(basicNFT.address, TOKEN_ID, updatedPrice)
                  ).to.emit("ItemListed")
                  const listing = await nftExchange.getListing(basicNFT.address, TOKEN_ID)
                  assert(listing.price.toString() == updatedPrice.toString())
              })
          })
          describe("withdrawProceeds", function () {
              it("doesn't allow 0 proceed withdrawal", async function () {
                  await expect(nftExchange.withdrawProceeds()).to.be.revertedWith("NoProceeds")
              })
              it("withdraws proceeds", async function () {
                  await nftExchange.listItem(basicNFT.address, TOKEN_ID, PRICE)
                  nftExchange = nftExchangeContract.connect(user)
                  await nftExchange.buyItem(basicNFT.address, TOKEN_ID, { value: PRICE })
                  nftExchange = nftExchangeContract.connect(deployer)

                  const deployerProceedsBefore = await nftExchange.getProceeds(deployer.address)
                  const deployerBalanceBefore = await deployer.getBalance()
                  const txResponse = await nftExchange.withdrawProceeds()
                  const transactionReceipt = await txResponse.wait(1)
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)
                  const deployerBalanceAfter = await deployer.getBalance()

                  assert(
                      deployerBalanceAfter.add(gasCost).toString() ==
                          deployerProceedsBefore.add(deployerBalanceBefore).toString()
                  )
              })
          })
      })
