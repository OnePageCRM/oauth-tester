import { useState, useRef, useEffect } from 'react'
import './FlowName.css'

interface FlowNameProps {
  name: string
  onRename: (newName: string) => void
}

export function FlowName({ name, onRename }: FlowNameProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  useEffect(() => {
    setEditValue(name)
  }, [name])

  const handleClick = () => {
    setIsEditing(true)
  }

  const handleBlur = () => {
    finishEditing()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      finishEditing()
    } else if (e.key === 'Escape') {
      setEditValue(name)
      setIsEditing(false)
    }
  }

  const finishEditing = () => {
    setIsEditing(false)
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== name) {
      onRename(trimmed)
    } else {
      setEditValue(name)
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        className="flow-name-input"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    )
  }

  return (
    <h1 className="flow-name" onClick={handleClick} title="Click to edit">
      {name}
    </h1>
  )
}
