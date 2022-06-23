// @ts-nocheck
import find from "lodash/find"
import sortBy from "lodash/sortBy"
import { nanoid } from "nanoid"
import { createContext, useContext, useEffect, useReducer, useState } from "react"

import Container from "./Container"

// notification defaults
export const displayTimeMS = 3000
export const transitionTimeMS = 1000
export const statusOptions = {
  CLOSED: "CLOSED",
  OPEN: "OPEN",
}

type TNotification = {
  singleton: (props: any) => void
  processing: (props: any) => void
  success: (props: any) => void
  error: (props: any) => void
  warn: (props: any) => void
}

const buildTypes = (id: string, dispatch: any) => {
  const update = (
    id: string,
    fields: object,
    dispatch: any,
    type = "add",
    createdAt: any,
    notificationType: string
  ) => {
    const dispatchObject: any = {
      id,
      type,
      dispatch,
      cb: null,
      fields,
      notificationType,
      createdAt,
    }

    dispatch(dispatchObject)

    return buildTypes(id, dispatch)
  }

  const _createdAt = Date.now()
  const _id = id || nanoid()
  const _type = id ? "update" : "add"

  return {
    singleton: (props: any) => update(_id, props, dispatch, _type, _createdAt, "SINGLETON"),
    processing: (props: any) => update(_id, props, dispatch, _type, _createdAt, "PROCESSING"),
    success: (props: any) => update(_id, props, dispatch, _type, _createdAt, "SUCCESS"),
    error: (props: any) => update(_id, props, dispatch, _type, _createdAt, "ERROR"),
    warn: (props: any) => update(_id, props, dispatch, _type, _createdAt, "WARN"),
  }
}

const createTimeout = (type: string, id: string, dispatch: any, cb: any, timeout: any) => {
  return setTimeout(() => {
    dispatch({
      type,
      id,
      dispatch,
      cb,
    })
  }, timeout)
}

const createNotification = (props: any) => {
  const updaters = buildTypes(props?.id, props?.dispatch)

  const notification = {
    id: props?.id,
    status: statusOptions.OPEN,
    update: (fields: any) => {
      props?.dispatch({
        type: "update",
        id: props?.id,
        dispatch: props.dispatch,
        fields: {
          ...fields,
        },
      })
    },
    close: () => {
      props?.dispatch({
        type: "close",
        id: props?.id,
        dispatch: props.dispatch,
      })
    },
    timeout:
      props?.fields?.timeout === null
        ? null
        : createTimeout(
            "close",
            props?.id,
            props?.dispatch,
            props?.cb,
            props?.fields?.timeout || displayTimeMS
          ),
    createdAt: props?.createdAt,
    ...updaters,
  }

  if (props?.fields?.title) notification.title = props?.fields?.title
  if (props?.fields?.subtitle) notification.subtitle = props?.fields?.subtitle
  if (props?.fields?.nav) notification.nav = props?.fields?.nav
  if (props?.notificationType) notification.type = props?.notificationType

  return notification
}

const updateNotification = (current, props) => {
  !!current.timeout && clearTimeout(current.timeout)

  const notification = {
    ...current,
    timeout:
      props?.fields?.timeout === null
        ? null
        : createTimeout(
            "close",
            current.id,
            props?.dispatch,
            props?.cb,
            props?.fields?.timeout || displayTimeMS
          ),
  }

  if (props?.fields?.title) notification.title = props?.fields?.title
  if (props?.fields?.subtitle) notification.subtitle = props?.fields?.subtitle
  if (props?.fields?.nav) notification.nav = props?.fields?.nav
  if (props?.notificationType) notification.type = props?.notificationType

  return notification
}

const closeNotification = (current, props) => {
  !!current.timeout && clearTimeout(current.timeout)

  const notification = {
    ...current,
    status: statusOptions.CLOSED,
    timeout: createTimeout("delete", current.id, props?.dispatch, props?.cb, transitionTimeMS),
  }

  return notification
}

const notificationReducer = (state, action) => {
  try {
    switch (action?.type) {
      case "add":
        state.items[action.id] = createNotification(action)
        !!action.cb && action.cb(state.items[id])
        break
      case "update":
        if (!state.items[action.id]) {
          state.items[action.id] = createNotification(action)
        } else {
          state.items[action.id] = updateNotification(state.items[action.id], action)
          !!action.cb && action.cb(state.items[action.id])
        }
        break
      case "close":
        if (!state.items[action.id]) break
        state.items[action.id] = closeNotification(state.items[action.id], action)
        !!action.cb && action.cb(state.items[action.id])
        break
      case "delete":
        if (!state.items[action.id]) break
        !!state.items[action.id].timeout && clearTimeout(state.items[action.id].timeout)
        delete state.items[action.id]
        !!action.cb && action.cb()
        break
      default:
        break
    }

    return { ...state }
  } catch (e) {
    //console.log(4444, e.message)
  }
}

interface IProps {
  children: React.ReactNode | null
}

const Context = createContext({})

export const useNotifications = () => useContext<any>(Context)

export const useNotificationById = (id: string) => {
  const { notifications } = useContext<any>(Context)
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    setNotification(find(notifications, { id }))
  }, [notifications, id])

  return notification
}

export const useNotification = () => {
  const { singleton } = useContext<any>(Context)
  const [notification, setNotification] = useState<TNotification>({})

  useEffect(() => {
    if (!singleton) return
    setNotification(singleton({ title: "", timeout: null }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return notification
}

const NotificationProvider = ({ children }: IProps) => {
  const [notifications, dispatch] = useReducer(notificationReducer, {
    items: {},
    index: 0,
  })

  const creators = buildTypes(null, dispatch)

  const sortedNotifications = sortBy(Object.values(notifications.items), ["createdAt"])

  return (
    <Context.Provider
      value={{
        notifications: sortedNotifications,
        ...creators,
      }}
    >
      <Container items={sortedNotifications} />
      {children}
    </Context.Provider>
  )
}

export default NotificationProvider
