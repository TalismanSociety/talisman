import styled from "styled-components"
import Panel from "@talisman/components/Panel"

interface SettingsProps {
  title: string
  subtitle: React.ReactNode
}

const StyledSettings = styled(Panel)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;

  > span {
    &.text {
      width: calc(100% - 9.4rem);

      .title {
        font-size: var(--font-size-normal);
        line-height: 1.55em;
      }

      .subtitle {
        font-size: var(--font-size-xsmall);
        color: var(--color-mid);
        line-height: 1.55em;
      }
    }

    &.children {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0 0.3em;

      .toggle {
        margin: 0;
      }
    }
  }
`

const Settings: React.FC<SettingsProps> = ({ title, subtitle, children }) => (
  <StyledSettings small>
    <span className="text">
      <div className="title">{title}</div>
      <div className="subtitle">{subtitle}</div>
    </span>
    <span className="children">{children}</span>
  </StyledSettings>
)

export default Settings
