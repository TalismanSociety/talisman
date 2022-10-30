import { ReactNode, useEffect, useState } from "react"
import { web3Accounts, web3Enable, web3FromSource } from '@polkadot/extension-dapp';
import { stringToHex } from "@polkadot/util";
import * as nacl from 'tweetnacl';
import { Button } from "talisman-ui"
import { stringToU8a, u8aToU8a, u8aToString, u8aToHex } from '@polkadot/util';
// import { Keyring } from '@polkadot/keyring';
import { mnemonicGenerate, cryptoWaitReady } from '@polkadot/util-crypto';
import keyring from '@polkadot/ui-keyring';

import { KeyringPair } from "@polkadot/keyring/types"
import { u8aEq } from "@polkadot/util"
import { jsonDecrypt } from "@polkadot/util-crypto"

import type { Keypair } from '@polkadot/util-crypto/types'

// values picked from polkadot keyring
const PKCS8_DIVIDER = new Uint8Array([161, 35, 3, 33, 0])
const PKCS8_HEADER = new Uint8Array([48, 83, 2, 1, 1, 48, 5, 6, 3, 43, 101, 112, 4, 34, 4, 32])
const SEC_LENGTH = 64
const SEED_LENGTH = 32
const SEED_OFFSET = PKCS8_HEADER.length

// built from reverse engineering polkadot keyring
export const getPrivateKey = (pair: KeyringPair, password: string) => {
  if (pair.isLocked) pair.unlock(password)

  const json = pair.toJson(password)
  pair.lock()
  const decrypted = jsonDecrypt(json, password)

  const header = decrypted.subarray(0, PKCS8_HEADER.length)
  if (!u8aEq(header, PKCS8_HEADER)) throw new Error("Invalid Pkcs8 header found in body")

  let privateKey = decrypted.subarray(SEED_OFFSET, SEED_OFFSET + SEC_LENGTH)
  let divOffset = SEED_OFFSET + SEC_LENGTH
  let divider = decrypted.subarray(divOffset, divOffset + PKCS8_DIVIDER.length)

  if (!u8aEq(divider, PKCS8_DIVIDER)) {
    divOffset = SEED_OFFSET + SEED_LENGTH
    privateKey = decrypted.subarray(SEED_OFFSET, divOffset)
    divider = decrypted.subarray(divOffset, divOffset + PKCS8_DIVIDER.length)

    if (!u8aEq(divider, PKCS8_DIVIDER)) throw new Error("Invalid Pkcs8 divider found in body")
  }

  return privateKey
}


const Box = ({ title, children }: { title: ReactNode; children?: ReactNode }) => (
  <div className="flex w-full grow flex-col items-center justify-center gap-4 text-center">
    <div className="">{title}</div>
    {children && <div className="flex w-full justify-center">{children}</div>}
  </div>
)

export const Sumi = () => {
    const [account1, setAccount1] = useState<any>(null)
    const [account2, setAccount2] = useState<any>(null)
    const [recipientPubKey, setRecipientPubKey] = useState<string>('')
    const [senderPubKey, setSenderPubKey] = useState<string>('')
    const [injector1, setInjector1] = useState<any>(null)
    const [injector2, setInjector2] = useState<any>(null)
    const [encryptedData, setEncryptedData] = useState<string>('');

    useEffect(() => {
        const connect = async () => {
          console.log("here here")
          const allInjected = await web3Enable('Sumi Playground');
          const allAccounts = await web3Accounts();
          setAccount1(allAccounts[0]);
          const injector1 = await web3FromSource(account1.meta.source);
          setInjector1(injector1)
          console.log("here1", injector1)
          console.log("allaccounts", allAccounts)

          setAccount2(allAccounts[1]);
          const injector2 = await web3FromSource(account2.meta.source);
          setInjector2(injector2)
          console.log("here2", injector2)

          await cryptoWaitReady().then(() => {
            keyring.loadAll({ ss58Format: 42, type: 'sr25519' });
            const RECIPIENT_ADDRESS = "13Dg1mYyNddpzDxZZ2ksZeAQxjDAqAzH24bGmBhzs5dQcmwF"   
            const SENDER_ADDRESS = "1YmEYgtfPbwx5Jos1PjKDWRpuJWSpTzytwZgYan6kgiquNS" 
        
            const json = keyring.saveAddress(RECIPIENT_ADDRESS, { name: "recipient" });
            const jsonSender = keyring.saveAddress(SENDER_ADDRESS, { name: "sender" });
            const accounts = keyring.getAddresses();
    
            accounts.forEach((a) => {if (a.meta.name == "recipient") console.log("yeet1111"), setRecipientPubKey(u8aToHex(a.publicKey))});
            
            // setRecipientPubKey(u8aToHex(accounts[0].publicKey))
            accounts.forEach((a) => {if (a.meta.name == "sender") console.log("yeet222"), setSenderPubKey(u8aToHex(a.publicKey))});

            console.log("here here recipient pub: ", {recipientPubKey})
          
          })
        }
        
        // if (!account){
          connect()
            // make sure to catch any error
            .catch(console.error);
        // }
    }, [])

    const encrypt = async (data: string) => {

      const encryptMessage = injector1?.signer?.encryptMessage;
    
      // eslint-disable-next-line no-extra-boolean-cast
      if (!!encryptMessage) {
        console.log("here in encrypt")

          console.log("this is encryptedData before set", encryptedData)
          console.log("this is recipientPubKey before encrypt", recipientPubKey)
          const { result } = await encryptMessage({
              address: account1.address,
              recipient: recipientPubKey,
              message: data,
          });
          console.log("here here in front-end", result)
          // setEncryptedData(u8aToHex(result))
          // console.log("this is encryptedData after set", encryptedData)
      }
  }

  const decrypt = async () => {
    const decryptMessage = injector2?.signer?.decryptMessage;

    // eslint-disable-next-line no-extra-boolean-cast
    if (!!decryptMessage) {
      console.log("here in encrypt")

        console.log("this is encryptedData before decrypt", encryptedData)
        console.log("this is senderPubKey before decrypt ", senderPubKey)

        const { result } = await decryptMessage({
            address: account2.address,
            sender: senderPubKey,
            message: "0x221eb0885aa61e04a093490b9cf29441e5f2e9f2f3d25c5d9d20ec49c1d6916b496ec2e35b21edf85556eacdf764ce1c3af044896dd30301183982ce80e4b52f2e80aaf36d18b1eba1a32005ffbefd952962227f2f4db3096e25f3e1a6708740fbbb98f0ce7b82b618a02018246589f69b4423b2f99705e1e410a1c78852a575d26a2430da5f0be34596be7cf6bbf50638153a11987c39",
        });
        console.log("here here in front-end", result)
        console.log("here here in front-end toString", result.toString())
        console.log("this is encryptedData after set", encryptedData)
    }
}

const localTest = async () => {

  // const keyring = new Keyring({ type: 'sr25519', ss58Format: 2 });
  cryptoWaitReady().then(() => {
    // load all available addresses and accounts
    keyring.loadAll({ ss58Format: 42, type: 'sr25519' });
  
    const mnemonicOne = mnemonicGenerate(12);
    const { pair: alice } = keyring.addUri(mnemonicOne, 'alicepass', { name: 'alice' }, 'sr25519');
    const alicePk = getPrivateKey(alice, "alicepass")
    
    // const mnemonicTwo = mnemonicGenerate(12);
    // const { pair: bob } = keyring.addUri(mnemonicTwo, 'bobpass', { name: 'bob' }, 'sr25519');
    // const bobPk = getPrivateKey(bob, "bobpass")  
    
    const recipientAddress = "13Dg1mYyNddpzDxZZ2ksZeAQxjDAqAzH24bGmBhzs5dQcmwF"    

    const json = keyring.saveAddress(recipientAddress, { name: 'recipient' });
    const accounts = keyring.getAddresses();

    accounts.forEach((a) =>
      console.log(a.meta.name, " ", a.publicKey)
    );

    
    const aliceKP = { publicKey: u8aToU8a(alice.publicKey), secretKey: u8aToU8a(alicePk) } as Keypair

    const message = stringToU8a('encrypt me pleaseeeee');

    // const encryptedData = sr25519Encrypt(message, u8aToU8a(bob.publicKey), aliceKP);
    
    // const decryptedData = sr25519Decrypt(encryptedData, { secretKey: u8aToU8a(bobPk) })

    // console.log("decrypted", u8aToString(decryptedData))


    // const nonce = nacl.randomBytes(nacl.box.nonceLength);

    // console.log("secretkeysize alice", u8aToU8a(alicePk).length)
    // console.log("secretkeysize bob ed", u8aToU8a(bobPk).length)
    // console.log("nacl", nacl.box.secretKeyLength)

    // // encrypt
    // const encryptedMessage = nacl.box(
    //   message,
    //   nonce,
    //   u8aToU8a(bob.publicKey),
    //   u8aToU8a(alicePk),
    // );
    
    // console.log({encryptedMessage})

  });
  
  


  // const encrypted = await alice.encryptMessage(message, bob.publicKey)
  // console.log({encrypted})
  // const decrypted = await bob.decryptMessage(encrypted, alice.publicKey)
  // console.log({decrypted})
  // const resulty = u8aToString(decrypted)
  // console.log({resulty})
  }



  return (
    <div className="space-y-8 text-left">
      <h2 className="text-3xl">Sumi Playground</h2>
      <div className="flex w-full justify-evenly gap-8">
        <Box title="pub key" />
        <Button onClick={() => encrypt('lots data to encrypt blah blah blah blahblah blahblah blahblah blahblah blahblah blahblah blahblah blahblah blahblah blahblah blahblah blahblah blahblah blahblah blahblah blahblah blahblah blahblah blahblah blahblah blahblah blahblah blahblah blahblah blahblah blahblah blahblah blahblah blahblah blahblah blahblah blah')}>Encrypt</Button>
        <Button onClick={() => decrypt()}>Decrypt</Button>
        <Button onClick={() => localTest()}>local test</Button>
      </div>
    </div>
  )
}