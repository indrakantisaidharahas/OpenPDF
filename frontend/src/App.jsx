import { useState } from 'react'

function App() {
  const [Gfile, setGfile] = useState(null)

  async function handler(e) {
    const file = e.target.files[0]
    if (!file) return

    setGfile(file)

    const data = new FormData()
    data.append('file', file)

    let res
    try {
      res = await fetch('https://localhost:3000', {
        method: 'POST',
        body: data
      })

      if (!res.ok) {
        console.log('network was not ok')
        return
      }
    } catch (err) {
      console.log('fetch/server error')
      return
    }

    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = 'compressed.pdf'
    a.click()

    URL.revokeObjectURL(url)
  }

  return (
    <>
      <label>
        please enter the pdf u want to compress
        <input type="file" accept="application/pdf" onChange={handler} />
      </label>
    </>
  )
}

export default App
