import styled from "styled-components"
import Button from "@talisman/components/Button"
import useTransactionById from "@ui/hooks/useTransactionById"
import Link from "@ui/domains/Transaction/Link"
import Status from "@ui/domains/Transaction/Status"

const Detail = ({ id, handleClose, className }: any) => {
  const { blockHash } = useTransactionById(id)

  return (
    <section className={className}>
      <article>
        <Status id={id} />
      </article>
      <footer>
        {!!blockHash ? (
          <Link prefix={"Included in block"} id={id} />
        ) : (
          <span className="wait">"Awaiting confirmation..."</span>
        )}
        <Button onClick={handleClose}>Close</Button>
      </footer>
    </section>
  )
}

const StyledDetail = styled(Detail)`
  display: flex;
  flex-direction: column;
  height: 100%;

  article {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    margin: 0 0 4vw 0;
  }

  footer {
    .transaction-link {
      font-size: var(--font-size-small);
      color: var(--color-background-muted-2x);
      margin-bottom: 1em;
      display: block;
      text-align: center;
      line-height: 1em;
    }

    .wait {
      //just a placeholder to prevent flickering
      visibility: hidden;
    }

    .button {
      display: block;
      width: 100%;
    }
  }
`

export default StyledDetail
