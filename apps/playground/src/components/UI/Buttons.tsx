import { Button } from "talisman-ui"

import { IconArrowRight } from "../../icons"
import { Layout } from "../shared/Layout"

export const Buttons = () => {
  return (
    <Layout title="Buttons">
      <div className="my-8 grid grid-cols-5 items-center gap-4 text-center">
        <div className="text-primary font-bold">Variable-Width</div>
        <div>Default</div>
        <div>Disabled</div>
        <div>Processing</div>
        <div>Processing & Disabled</div>

        <div>Default</div>
        <div>
          <Button>Button</Button>
        </div>
        <div>
          <Button disabled>Button</Button>
        </div>
        <div>
          <Button processing>Button</Button>
        </div>
        <div>
          <Button processing disabled>
            Button
          </Button>
        </div>

        <div>Primary</div>
        <div>
          <Button primary>Button</Button>
        </div>
        <div>
          <Button primary disabled>
            Button
          </Button>
        </div>
        <div>
          <Button primary processing>
            Button
          </Button>
        </div>
        <div>
          <Button primary processing disabled>
            Button
          </Button>
        </div>

        <div>Orange</div>
        <div>
          <Button color="orange">Button</Button>
        </div>
        <div>
          <Button color="orange" disabled>
            Button
          </Button>
        </div>
        <div>
          <Button color="orange" processing>
            Button
          </Button>
        </div>
        <div>
          <Button color="orange" processing disabled>
            Button
          </Button>
        </div>

        <div>Red</div>
        <div>
          <Button color="red">Button</Button>
        </div>
        <div>
          <Button color="red" disabled>
            Button
          </Button>
        </div>
        <div>
          <Button color="red" processing>
            Button
          </Button>
        </div>
        <div>
          <Button color="red" processing disabled>
            Button
          </Button>
        </div>
      </div>

      <div className="my-8 grid grid-cols-5 items-center gap-4 text-center">
        <div className="text-primary font-bold">Variable-Width + Icon</div>
        <div>Default</div>
        <div>Disabled</div>
        <div>Processing</div>
        <div>Processing & Disabled</div>

        <div>Default</div>
        <div>
          <Button icon={IconArrowRight}>Button</Button>
        </div>
        <div>
          <Button disabled icon={IconArrowRight}>
            Button
          </Button>
        </div>
        <div>
          <Button processing icon={IconArrowRight}>
            Button
          </Button>
        </div>
        <div>
          <Button processing disabled icon={IconArrowRight}>
            Button
          </Button>
        </div>

        <div>Primary</div>
        <div>
          <Button primary icon={IconArrowRight}>
            Button
          </Button>
        </div>
        <div>
          <Button primary disabled icon={IconArrowRight}>
            Button
          </Button>
        </div>
        <div>
          <Button primary processing icon={IconArrowRight}>
            Button
          </Button>
        </div>
        <div>
          <Button primary processing disabled icon={IconArrowRight}>
            Button
          </Button>
        </div>

        <div>Orange</div>
        <div>
          <Button color="orange" icon={IconArrowRight}>
            Button
          </Button>
        </div>
        <div>
          <Button color="orange" disabled icon={IconArrowRight}>
            Button
          </Button>
        </div>
        <div>
          <Button color="orange" processing icon={IconArrowRight}>
            Button
          </Button>
        </div>
        <div>
          <Button color="orange" processing disabled icon={IconArrowRight}>
            Button
          </Button>
        </div>

        <div>Red</div>
        <div>
          <Button color="red" icon={IconArrowRight}>
            Button
          </Button>
        </div>
        <div>
          <Button color="red" disabled icon={IconArrowRight}>
            Button
          </Button>
        </div>
        <div>
          <Button color="red" processing icon={IconArrowRight}>
            Button
          </Button>
        </div>
        <div>
          <Button color="red" processing disabled icon={IconArrowRight}>
            Button
          </Button>
        </div>
      </div>

      <div className="my-8 grid grid-cols-5 items-center gap-4 text-center">
        <div className="text-primary font-bold">Full-Width</div>
        <div>Default</div>
        <div>Disabled</div>
        <div>Processing</div>
        <div>Processing & Disabled</div>

        <div>Default</div>
        <div>
          <Button fullWidth>Button</Button>
        </div>
        <div>
          <Button fullWidth disabled>
            Button
          </Button>
        </div>
        <div>
          <Button fullWidth processing>
            Button
          </Button>
        </div>
        <div>
          <Button fullWidth processing disabled>
            Button
          </Button>
        </div>

        <div>Primary</div>
        <div>
          <Button fullWidth primary>
            Button
          </Button>
        </div>
        <div>
          <Button fullWidth primary disabled>
            Button
          </Button>
        </div>
        <div>
          <Button fullWidth primary processing>
            Button
          </Button>
        </div>
        <div>
          <Button fullWidth primary processing disabled>
            Button
          </Button>
        </div>

        <div>Orange</div>
        <div>
          <Button fullWidth color="orange">
            Button
          </Button>
        </div>
        <div>
          <Button fullWidth color="orange" disabled>
            Button
          </Button>
        </div>
        <div>
          <Button fullWidth color="orange" processing>
            Button
          </Button>
        </div>
        <div>
          <Button fullWidth color="orange" processing disabled>
            Button
          </Button>
        </div>

        <div>Red</div>
        <div>
          <Button fullWidth color="red">
            Button
          </Button>
        </div>
        <div>
          <Button fullWidth color="red" disabled>
            Button
          </Button>
        </div>
        <div>
          <Button fullWidth color="red" processing>
            Button
          </Button>
        </div>
        <div>
          <Button fullWidth color="red" processing disabled>
            Button
          </Button>
        </div>
      </div>
    </Layout>
  )
}
