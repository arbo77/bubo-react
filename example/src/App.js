import React, { useEffect } from 'react'
import { Screen, useStore } from 'bubo-react'

const App = () => {
  const [data, setData] = useStore('data')

  const onClick = () => {
    setData({
      counter: (data?.counter || 0) + 1,
    })
  }

  useEffect(() => {
    return () => false;
  })

  return <Screen text={`click # ${data?.counter}`} onClick={onClick} />
}

export default App
