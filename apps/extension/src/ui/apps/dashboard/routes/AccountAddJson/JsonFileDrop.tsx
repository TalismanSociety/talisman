import { FilePlusIcon, XIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { FC, MouseEventHandler, useCallback, useMemo, useState } from "react"
import { DropzoneOptions, useDropzone } from "react-dropzone"
import { Trans, useTranslation } from "react-i18next"

type JsonFileDropProps = {
  onChange?: (file?: File) => void
}

export const JsonFileDrop: FC<JsonFileDropProps> = ({ onChange }) => {
  const { t } = useTranslation("account-add")
  const [file, setFile] = useState<File>()

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const [file] = acceptedFiles
      setFile(file)
      onChange?.(file)
    },
    [onChange]
  )

  const options = useMemo<DropzoneOptions>(() => {
    return {
      onDrop,
      accept: { "application/json": [".json"] },
      maxFiles: 1,
    }
  }, [onDrop])

  const handleForgetFileClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      e.stopPropagation()
      setFile(undefined)
      onChange?.(undefined)
    },
    [onChange]
  )

  const { getRootProps, getInputProps, isDragAccept, isDragReject } = useDropzone(options)

  return (
    <div
      {...getRootProps()}
      className={classNames(
        "border-grey-700 hover:bg-grey-900 flex h-[16rem] cursor-pointer flex-col items-center gap-8 rounded border border-dashed p-8",
        isDragAccept && "bg-primary/10",
        isDragReject && "bg-alert-error/10"
      )}
    >
      <input {...getInputProps()} />
      <div className="bg-primary/10 rounded-full p-5">
        <FilePlusIcon className="text-primary text-lg" />
      </div>
      <div className="flex grow flex-col items-center justify-center gap-6">
        {file ? (
          <div className="bg-grey-800 flex h-16 w-[24rem] max-w-full items-center rounded-sm pl-6 text-xs">
            <div className="grow overflow-hidden text-ellipsis whitespace-nowrap">{file.name}</div>
            <button
              className="text-body-secondary hover:text-body p-6"
              type="button"
              onClick={handleForgetFileClick}
            >
              <XIcon />
            </button>
          </div>
        ) : (
          <div>
            <Trans t={t}>
              Drop your JSON file or <span className="text-primary font-bold">Browse</span>
            </Trans>
          </div>
        )}
        {isDragReject ? (
          <div className="text-alert-warn text-xs">{t("Invalid JSON file")}</div>
        ) : (
          <div className="text-grey-500 text-xs">
            {file ? t("Replace File") : t("Talisman supports the import of multiple accounts")}
          </div>
        )}
      </div>
    </div>
  )
}
