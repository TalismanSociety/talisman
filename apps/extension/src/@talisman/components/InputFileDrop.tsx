import styled from "styled-components"
import { ReactComponent as IconClear } from "@talisman/theme/icons/x-circle.svg"
import { useDropzone } from "react-dropzone"
import { MouseEvent, useCallback, useState } from "react"

const DropZone = styled.div`
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
`

type InputFileProps = {
  onChange?: (file?: File) => void
  inputProps?: React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  >
  hint?: string
}

export const InputFileDrop = ({ hint, inputProps, onChange }: InputFileProps) => {
  const [file, setFile] = useState<File>()

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const [file] = acceptedFiles
      setFile(file)
      if (onChange) onChange(file)
    },
    [onChange]
  )

  const handleClear = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      onDrop([])
    },
    [onDrop]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: inputProps?.accept ?? "*/*",
    maxFiles: 1,
  })

  const inactiveDragLabel = file ? "Replace file" : "Choose file"

  return (
    <DropZone {...getRootProps()}>
      {!!hint && <span className="hint">{hint}</span>}
      <input type="file" {...getInputProps(inputProps)} className="cta" />
      <span className="cta">{isDragActive ? "Drop file here..." : inactiveDragLabel}</span>
      {file && (
        <div className="files">
          {
            <div>
              <span>{file.name}</span>
              <IconClear onClick={handleClear} />
            </div>
          }
        </div>
      )}
    </DropZone>
  )
}
