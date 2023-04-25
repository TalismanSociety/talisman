import { ReactNode } from "react"
import { Checkbox } from "talisman-ui"

import { Layout } from "../shared/Layout"

const Box = ({ title, children }: { title: ReactNode; children?: ReactNode }) => (
  <div className="flex w-full grow flex-col justify-center gap-4 text-center">
    <div className="">{title}</div>
    {children && (
      <div>
        <div>{children}</div>
      </div>
    )}
  </div>
)

const Section = ({
  title,
  children,
  className,
}: {
  title: ReactNode
  children?: ReactNode
  className?: string
}) => (
  <div>
    <h3 className="text-xl">{title}</h3>
    <div className={className}>{children}</div>
  </div>
)

export const Checkboxes = () => {
  return (
    <Layout title="Checkboxes">
      <Section title="Default">
        <div className="flex w-full justify-evenly gap-8">
          <Box title="normal">
            <Checkbox>Label of the checkbox</Checkbox>
          </Box>
          <Box title="disabled">
            <Checkbox disabled>Label of the checkbox</Checkbox>
          </Box>
          <Box title="checked">
            <Checkbox defaultChecked>Label of the checkbox</Checkbox>
          </Box>
          <Box title="checked+disabled">
            <Checkbox disabled defaultChecked>
              Label of the checkbox
            </Checkbox>
          </Box>
        </div>
      </Section>
      <Section title="text-body-secondary" className="text-body-secondary">
        <div className="flex w-full justify-evenly gap-8">
          <Box title="normal">
            <Checkbox>Label of the checkbox</Checkbox>
          </Box>
          <Box title="disabled">
            <Checkbox disabled>Label of the checkbox</Checkbox>
          </Box>
          <Box title="checked">
            <Checkbox defaultChecked>Label of the checkbox</Checkbox>
          </Box>
          <Box title="checked+disabled">
            <Checkbox disabled defaultChecked>
              Label of the checkbox
            </Checkbox>
          </Box>
        </div>
      </Section>
      <Section title="text-xl" className="text-xl">
        <div className="flex w-full justify-evenly gap-8">
          <Box title="normal">
            <Checkbox>Label of the checkbox</Checkbox>
          </Box>
          <Box title="disabled">
            <Checkbox disabled>Label of the checkbox</Checkbox>
          </Box>
          <Box title="checked">
            <Checkbox defaultChecked>Label of the checkbox</Checkbox>
          </Box>
          <Box title="checked+disabled">
            <Checkbox disabled defaultChecked>
              Label of the checkbox
            </Checkbox>
          </Box>
        </div>
      </Section>
      <Section title="text-xl text-body-secondary" className="text-body-secondary text-xl">
        <div className="flex w-full justify-evenly gap-8">
          <Box title="normal">
            <Checkbox>Label of the checkbox</Checkbox>
          </Box>
          <Box title="disabled">
            <Checkbox disabled>Label of the checkbox</Checkbox>
          </Box>
          <Box title="checked">
            <Checkbox defaultChecked>Label of the checkbox</Checkbox>
          </Box>
          <Box title="checked+disabled">
            <Checkbox disabled defaultChecked>
              Label of the checkbox
            </Checkbox>
          </Box>
        </div>
      </Section>
    </Layout>
  )
}
