import { useCallback } from "react"
import styled from "styled-components"
import Button from "@talisman/components/Button"
import { useOnboard } from "../context"
import { Layout } from "../layout"
import imgNipsey from "@talisman/theme/images/onboard_nipsey.png"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"

const CustomLayout = styled(Layout)`
  @media (max-width: 1146px) {
    .content {
      text-align: center;
    }
  }
`

const Image = styled(motion.img)`
  height: 62rem;
  width: 53.6rem;

  @media (max-width: 1146px) {
    height: calc(0.75 * 62rem);
    width: calc(0.75 * 53.6rem);
  }
`

const Buttons = styled.div`
  margin-top: 1.6rem;
  display: flex;
  flex-direction: column;
  gap: 1.6rem;

  .button {
    width: 29.7rem;
  }

  @media (max-width: 1146px) {
    align-items: center;
  }
`

export const Onboard = () => {
  const { reset } = useOnboard()
  const navigate = useNavigate()

  const handleStart = useCallback(
    (path: string) => () => {
      reset()
      navigate(path)
    },
    [navigate, reset]
  )

  return (
    <CustomLayout withBack picture={<Image src={imgNipsey} alt="Nipsey" />}>
      <h1>
        Welcome traveller!
        <br />
        Let’s add an account.
      </h1>
      <p>Create a new account or import an existing one.</p>
      <Buttons>
        <Button primary onClick={handleStart("/create/name")}>
          Create a new account
        </Button>
        <Button onClick={handleStart("/create/secret")}>I already have one</Button>
      </Buttons>
    </CustomLayout>
  )
}
