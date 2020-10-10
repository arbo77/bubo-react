import React from 'react'
export * from './store'

export const Screen = ({ text, onClick }) => {
  return <button onClick={onClick}>{text}</button>
}
