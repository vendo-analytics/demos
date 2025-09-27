import { useEffect, useMemo, useState } from 'react'
import './App.css'
import YooptaEditor, { createYooptaEditor } from '@yoopta/editor'
import Paragraph from '@yoopta/paragraph'
import { HeadingOne, HeadingTwo, HeadingThree } from '@yoopta/headings'
import { BulletedList, NumberedList, TodoList } from '@yoopta/lists'
import Blockquote from '@yoopta/blockquote'
import Code from '@yoopta/code'
import Link from '@yoopta/link'
import Image from '@yoopta/image'
import Toolbar from '@yoopta/toolbar'
import { Bold, Italic, Underline, Strike, CodeMark, Highlight } from '@yoopta/marks'
import ChartBlock from './plugins/ChartBlock'

function App() {
  const editor = useMemo(() => createYooptaEditor(), [])
  const [, setValue] = useState<any>()

  useEffect(() => {
    if (editor.isEmpty()) {
      // Seed with a paragraph first to ensure a text-starting block at index 0
      editor.insertBlock('Paragraph', { focus: false })
      editor.insertBlock('HeadingOne', { focus: false })
      editor.insertBlock('BulletedList', { focus: false })
      editor.insertBlock('NumberedList', { focus: false })
      editor.insertBlock('TodoList', { focus: false })
      editor.insertBlock('Blockquote', { focus: false })
      editor.insertBlock('Code', { focus: false })
      editor.insertBlock('chart-block', { focus: false })
      editor.insertBlock('Paragraph', { focus: false })
    }
  }, [editor])

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <h2 style={{ marginBottom: 12 }}>Reports Notebook</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => {
            const data = editor.getEditorValue()
            localStorage.setItem('reports-doc', JSON.stringify(data))
          }}
        >
          Save
        </button>
        <button
          onClick={() => {
            const raw = localStorage.getItem('reports-doc')
            if (!raw) return
            const parsed = JSON.parse(raw)
            editor.setEditorValue(parsed)
          }}
        >
          Load
        </button>
        <button
          onClick={() => {
            editor.insertBlock('chart-block', { focus: true })
          }}
        >
          Insert Chart
        </button>
      </div>
      <YooptaEditor
        editor={editor}
        plugins={[
          Paragraph,
          HeadingOne,
          HeadingTwo,
          HeadingThree,
          BulletedList,
          NumberedList,
          TodoList,
          Blockquote,
          Code,
          Link,
          Image,
          ChartBlock,
        ]}
        marks={[Bold, Italic, Underline, Strike, CodeMark, Highlight]}
        onChange={(v) => setValue(v as any)}
        placeholder="Type '/' to insert blocks..."
      >
        <Toolbar />
      </YooptaEditor>
    </div>
  )
}

export default App
