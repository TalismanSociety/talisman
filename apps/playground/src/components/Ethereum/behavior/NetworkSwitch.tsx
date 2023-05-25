import { ethers } from "ethers"
import { useCallback, useState } from "react"
import { Button } from "talisman-ui"
import { useAccount } from "wagmi"

import { Section } from "../../shared/Section"
import { CrestAbi } from "./CrestAbi"

export const NetworkSwitch = () => {
  const [output, setOutput] = useState("")

  const { connector } = useAccount()

  const handleTestClick = useCallback(async () => {
    setOutput("")

    const appendOutput = (text: string) => {
      setOutput((prev) => prev + text + "\n")
    }

    try {
      const injectedProvider = await connector?.getProvider()

      const switchToMoonbeam = async () => {
        appendOutput(`Switching to moonbeam `)
        const res = await injectedProvider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x504" }],
        })
        appendOutput(`Switched to moonbeam : ${res}`)
      }

      const switchToAstar = async () => {
        appendOutput(`Switching to astar`)
        const res = await injectedProvider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x250" }],
        })
        appendOutput(`Switched to astar : ${res}`)
      }

      const callNftTokenUri = async () => {
        appendOutput(`fetching NFT info`)
        const ci = ethers.Contract.getInterface(CrestAbi)
        const data = ci.encodeFunctionData("tokenURI", [1])

        const res = await injectedProvider.request({
          method: "eth_call",
          params: [
            {
              to: "0x8417F77904a86436223942a516f00F8aDF933B70",
              data,
            },
          ],
        })

        const decoded = ci.decodeFunctionResult("tokenURI", res)
        appendOutput(`fetched NFT info ${decoded.toString().slice(0, 40)}...`)
      }

      await switchToMoonbeam()
      const prom = callNftTokenUri()
      await switchToAstar()
      await prom
    } catch (err) {
      appendOutput(`Error : ${err?.toString()}`)
    }
  }, [connector])

  return (
    <Section title="Network Switch">
      <div>
        This will :
        <ul>
          <li>- switch to Moonbeam</li>
          <li>- asynchronously make an expensive read contract call</li>
          <li>- switch to Astar</li>
        </ul>
      </div>
      <div className="mt-8">
        <Button onClick={handleTestClick}>Test</Button>
      </div>
      <pre className="bg-grey-800 mt-8 h-[200px] w-[600px] overflow-auto rounded px-4 py-2">
        {output}
      </pre>
    </Section>
  )
}
