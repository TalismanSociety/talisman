import { ReactComponent as IconClear } from "@talisman/theme/icons/x-circle.svg"
import { DropzoneOptions, useDropzone } from "react-dropzone"
// @ts-nocheck
import styled from "styled-components"

import Field, { IFieldProps, fieldDefaultProps } from "./Field"

interface IProps extends IFieldProps<File> {
  accept?: string
  hint?: string
}

const defaultProps: IProps = {
  ...fieldDefaultProps,
  accept: "*/*",
}

const FileDrop = ({ value, accept, hint, onChange, fieldProps, ...rest }: IProps) => {
  const onDrop: DropzoneOptions["onDrop"] = (acceptedFiles) => {
    const [file] = acceptedFiles
    onChange(file)
  }
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept, maxFiles: 1 })

  const inactiveDragLabel = value ? "Replace file" : "Choose file"

  return (
    <div {...getRootProps()}>
      <Field {...rest}>
        {!!hint && <span className="hint">{hint}</span>}
        <input {...getInputProps()} className="cta" />
        <span className="cta">{isDragActive ? "Drop file here..." : inactiveDragLabel}</span>
        {!!value && (
          <div className="files">
            <div>
              <span>{String(value)}</span>
              <IconClear
                onClick={(e) => {
                  e.stopPropagation()
                  onChange()
                }}
              />
            </div>
          </div>
        )}
      </Field>
    </div>
  )
}

FileDrop.defaultProps = defaultProps

const StyledFileDrop = styled(FileDrop)`
  :hover {
    cursor: pointer;
  }
  .cta {
    padding: 1rem 1.5rem;
    background-color: var(--color-primary);
    color: var(--color-background);
    border-radius: 1rem;
    &:hover {
      cursor: pointer;
    }
  }

  .children {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--padding-large);

    > .hint {
      font-size: var(--font-size-small);
      margin: 0 0 2rem 0;
    }

    > .files {
      margin: 3rem auto 0;
      display: block;
      width: 100%;

      > * {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: var(--font-size-small);
        border: 1px dotted var(--color-mid);
        padding: var(--padding-small);
        text-align: left;
        line-height: 1em;

        > span {
          max-width: 90%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        > svg {
          opacity: 0.3;
          cursor: pointer;
        }

        & + * {
          margin-top: 0.3rem;
        }
      }
    }
  }
`

export default StyledFileDrop
