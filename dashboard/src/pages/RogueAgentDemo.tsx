import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function RogueAgentDemo() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate('/#demo', { replace: true })
  }, [navigate])
  return null
}
