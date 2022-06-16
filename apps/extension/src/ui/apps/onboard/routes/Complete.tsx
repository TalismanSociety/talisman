import imgHand from "@talisman/theme/images/hand_open_static_dark.gif"
import imgHandOk from "@talisman/theme/images/onboard_complete.gif"
import { api } from "@ui/api"
import { Layout } from "../layout"
import styled from "styled-components"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { motion, Variants } from "framer-motion"
import { useEffect, useState } from "react"

const Image = styled(motion.img)`
  height: 23.8rem;
  width: 27.9rem;
  margin-bottom: 0.8rem;
`

const H1 = styled(motion.h1)`
  &&& {
    margin-bottom: 2.4rem;
  }
`
const P = styled(motion.p)`
  &&& {
    margin-bottom: 3.2rem;
  }
`

const Content = styled(motion.div)`
  align-items: center;
  text-align: center;
`

const BtnComplete = styled(SimpleButton)`
  width: 24rem;
`

const CONTAINER: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.2,
    },
  },
}

const SLIDE_UP: Variants = {
  initial: { opacity: 0, y: 100 },
  animate: { opacity: 1, y: 0 },
}

const ImgThumbUp = () => {
  // use static GIF at start
  const [img, setImg] = useState(imgHand)

  // after 0.5s, replace by animated GIF that turns into a thumb up
  useEffect(() => {
    const timeout = setTimeout(() => setImg(imgHandOk), 500)
    return () => clearTimeout(timeout)
  }, [])

  return <Image src={img} alt="complete" />
}

export const Complete = () => (
  <Layout>
    <Content layout variants={CONTAINER} initial="initial" animate="animate">
      <ImgThumbUp />
      <H1 variants={SLIDE_UP}>Congratulations friend!</H1>
      <P variants={SLIDE_UP}>You’ve unlocked the Talisman.</P>
      <motion.div variants={SLIDE_UP}>
        <BtnComplete
          autoFocus
          primary
          onClick={() => {
            api.dashboardOpen("/portfolio")
            window.close()
          }}
        >
          Go to my account
        </BtnComplete>
      </motion.div>
    </Content>
  </Layout>
)
