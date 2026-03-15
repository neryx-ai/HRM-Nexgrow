"use client"

import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/ui/sidebar'
import { PanelLeftIcon, PanelRightIcon } from 'lucide-react'

function MySidebarTrigger() {
    const { toggleSidebar, open } = useSidebar()
    
    return (
    <Button variant="outline" size="icon" onClick={toggleSidebar}>
      {open ? <PanelLeftIcon /> : <PanelRightIcon />}
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
}

export default MySidebarTrigger