import { ReactNode } from "react"
import { Button } from "talisman-ui"

import { IconArrowRight } from "../../icons"
import { Layout } from "../shared/Layout"

const Box = ({ title, children }: { title: ReactNode; children?: ReactNode }) => (
  <div className="flex w-full grow flex-col items-center justify-center gap-4 text-center">
    <div className="">{title}</div>
    {children && <div className="flex w-full justify-center">{children}</div>}
  </div>
)

export const Buttons = () => {
  return (
    <Layout title="Buttons">
      <h3 className="text-lg">Variable-Width</h3>
      <div className="flex w-full justify-evenly gap-8">
        <Box title="Default" />
        <Box title="Default">
          <Button>Button</Button>
        </Box>
        <Box title="Disabled">
          <Button disabled>Button</Button>
        </Box>
        <Box title="Processing">
          <Button processing>Button</Button>
        </Box>
        <Box title="Processing + disabled">
          <Button processing disabled>
            Button
          </Button>
        </Box>
      </div>
      <div className="flex w-full justify-evenly gap-8">
        <Box title="Primary" />
        <Box title="Default">
          <Button primary>Button</Button>
        </Box>
        <Box title="Disabled">
          <Button primary disabled>
            Button
          </Button>
        </Box>
        <Box title="Processing">
          <Button primary processing>
            Button
          </Button>
        </Box>
        <Box title="Processing + disabled">
          <Button primary processing disabled>
            Button
          </Button>
        </Box>
      </div>
      <h3 className="text-lg">Variable-Width + Icon</h3>
      <div className="flex w-full justify-evenly gap-8">
        <Box title="Default" />
        <Box title="Default">
          <Button icon={IconArrowRight}>Button</Button>
        </Box>
        <Box title="Disabled">
          <Button disabled icon={IconArrowRight}>
            Button
          </Button>
        </Box>
        <Box title="Processing">
          <Button processing icon={IconArrowRight}>
            Button
          </Button>
        </Box>
        <Box title="Processing + disabled">
          <Button processing disabled icon={IconArrowRight}>
            Button
          </Button>
        </Box>
      </div>
      <div className="flex w-full justify-evenly gap-8">
        <Box title="Primary" />
        <Box title="Default">
          <Button primary icon={IconArrowRight}>
            Button
          </Button>
        </Box>
        <Box title="Disabled">
          <Button primary disabled icon={IconArrowRight}>
            Button
          </Button>
        </Box>
        <Box title="Processing">
          <Button primary processing icon={IconArrowRight}>
            Button
          </Button>
        </Box>
        <Box title="Processing + disabled">
          <Button primary disabled processing icon={IconArrowRight}>
            Button
          </Button>
        </Box>
      </div>
      <h3 className="text-lg">Full-Width</h3>
      <div className="flex w-full justify-evenly gap-8">
        <Box title="Default" />
        <Box title="Default">
          <Button className="w-full">Button</Button>
        </Box>
        <Box title="Disabled">
          <Button className="w-full" disabled>
            Button
          </Button>
        </Box>
        <Box title="Processing">
          <Button className="w-full" processing>
            Button
          </Button>
        </Box>
      </div>
      <div className="flex w-full justify-evenly gap-8">
        <Box title="Primary" />
        <Box title="Default">
          <Button className="w-full" primary>
            Button
          </Button>
        </Box>
        <Box title="Disabled">
          <Button className="w-full" primary disabled>
            Button
          </Button>
        </Box>
        <Box title="Processing">
          <Button className="w-full" primary processing>
            Button
          </Button>
        </Box>
      </div>
      <h3 className="text-lg">Full-Width + Icon</h3>
      <div className="flex w-full justify-evenly gap-8">
        <Box title="Default" />
        <Box title="Default">
          <Button className="w-full" icon={IconArrowRight}>
            Button
          </Button>
        </Box>
        <Box title="Disabled">
          <Button className="w-full" disabled icon={IconArrowRight}>
            Button
          </Button>
        </Box>
        <Box title="Processing">
          <Button className="w-full" processing icon={IconArrowRight}>
            Button
          </Button>
        </Box>
      </div>
      <div className="flex w-full justify-evenly gap-8">
        <Box title="Primary" />
        <Box title="Default">
          <Button className="w-full" primary icon={IconArrowRight}>
            Button
          </Button>
        </Box>
        <Box title="Disabled">
          <Button className="w-full" primary disabled icon={IconArrowRight}>
            Button
          </Button>
        </Box>
        <Box title="Processing">
          <Button className="w-full" primary processing icon={IconArrowRight}>
            Button
          </Button>
        </Box>
      </div>
    </Layout>
  )
}
