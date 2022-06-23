import React, { FC, MouseEvent, ReactNode, useCallback } from "react"
import { NavLinkProps, NavLink as RouterLink, useNavigate } from "react-router-dom"
import styled from "styled-components"

export interface ILinkProps {
  large?: boolean
  small?: boolean
  primary?: boolean
  inverted?: boolean
  disabled?: boolean
  processing?: boolean
  to?: string
  onClick?: (cb?: any) => void
  icon?: ReactNode
  className?: string
  external?: boolean
  allowReferrer?: boolean
  tabIndex?: number
  end?: boolean
  children?: ReactNode
}

const LinkChildren = ({ icon, children }: { icon?: any; children: any }) => (
  <>
    {icon && <span className="icon">{icon}</span>}
    {React.Children.map(children, (child) =>
      typeof child === "string" ? <span>{child}</span> : child
    )}
  </>
)

type SmartLinkProps = NavLinkProps & {
  to: string
  className?: string
  external?: boolean
  allowReferrer?: boolean
  tabIndex?: number
  end?: boolean
  children?: ReactNode
}

const SmartLink: FC<SmartLinkProps> = ({
  to,
  external,
  end,
  allowReferrer,
  className,
  tabIndex,
  children,
}) => {
  return external ? (
    // eslint-disable-next-line react/jsx-no-target-blank
    <a
      href={to}
      className={className}
      target="_blank"
      rel={allowReferrer ? undefined : "noreferrer"}
      tabIndex={tabIndex}
    >
      {children}
    </a>
  ) : (
    <RouterLink to={to} className={className} tabIndex={tabIndex} end={end}>
      {children}
    </RouterLink>
  )
}

const Link: FC<ILinkProps> = ({
  to,
  onClick,
  disabled,
  processing,
  icon,
  children,
  external,
  allowReferrer,
  className,
  tabIndex,
  end,
}) => {
  const navigate = useNavigate()
  const handleClick = useCallback(
    (e: MouseEvent) => {
      const callback = to ? () => navigate(to) : undefined
      e.preventDefault()
      e.stopPropagation()
      !disabled && !processing && !!onClick && onClick(callback)
    },
    [disabled, navigate, onClick, processing, to]
  )

  return !!to ? (
    !!onClick ? (
      <button
        type="button"
        onClick={handleClick}
        className={`link ${className}`}
        tabIndex={tabIndex}
      >
        <LinkChildren icon={icon}>{children}</LinkChildren>
      </button>
    ) : (
      <SmartLink
        external={external}
        allowReferrer={allowReferrer}
        to={!disabled && !processing ? to : "#"}
        className={`link ${className}`}
        tabIndex={tabIndex}
        end={end}
      >
        <LinkChildren icon={icon}>{children}</LinkChildren>
      </SmartLink>
    )
  ) : (
    <button type="button" className={`link ${className}`} onClick={handleClick} tabIndex={tabIndex}>
      <LinkChildren icon={icon}>{children}</LinkChildren>
    </button>
  )
}

const StyledLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  border: none;
  font-size: var(
    --font-size-${({ large, small }) => (!!large ? "large" : !!small ? "small" : "normal")}
  );
  color: var(--color-foreground);
  background: transparent;
  padding: 1em 0.4em;
  line-height: 1.6em;
  cursor: pointer;
  transition: all var(--transition-speed) ease-in-out;
  text-align: center;
  position: relative;
  overflow: hidden;

  > * {
    transition: all var(--transition-speed-fast) ease-in;
    margin: 0 0.4em;

    &.icon {
      margin-bottom: 0.05em;
      font-size: 1.5em;
      svg {
        display: block;
      }
    }
  }

  &:after {
    content: "";
    position: absolute;
    top: 120%;
    left: 50%;
    transform: translate(-50%, -50%);
    opacity: 0;
    transition: all var(--transition-speed-fast) ease-out;
  }

  // primary
  ${({ primary }) =>
    !!primary &&
    `
    color: var(--color-primary);
  `}

  // inverted
  ${({ inverted }) =>
    !!inverted &&
    `
    color: var(--color-background);
  `}

  // disabled
  ${({ disabled }) =>
    !!disabled &&
    `
    opacity: 0.3;
    
    pointer-events: none;
    
    &:hover{
      opacity: 0.3;
    }

    &:before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: all;
      cursor: not-allowed;
    }
  `}

  // processing
  ${({ processing }) =>
    !!processing &&
    `
    opacity: 0.3;
    cursor: wait;
    &:hover{
      opacity: 0.3;
    }

    >*{
      transform: translateY(-200%);
      opacity: 0;
    }

    &:after{
      content: '⟳';
      top: 50%;
      opacity: 1;
      animation-name: spin_button_processing;
      animation-duration: 2000ms;
      animation-iteration-count: infinite;
      animation-timing-function: linear; 
    }

    @keyframes spin_button_processing {
        from {
            transform: translate(-50%, -50%) rotate(0deg);
        }
        to {
            transform: translate(-50%, -50%) rotate(360deg);
        }
    }
  `}
`

export default StyledLink
