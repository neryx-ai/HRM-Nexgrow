import React from 'react'
import { SidebarTrigger } from '../ui/sidebar'
import { Separator } from '../ui/separator'
import { ModeToggle } from '../theme/mode-toggle'
import MySidebarTrigger from './my-sidebar-trigger'

function MyNavbar() {
  return (
    <div className='w-full relative flex items-center p-2 pr-4'>
        <div className='flex items-center gap-2 w-full bg-sidebar p-2 border border-foreground/5 shadow-sm rounded'>
            <div className='flex items-center gap-2 w-full'>
                <MySidebarTrigger />
                <Separator orientation="vertical" />
                <p className='text-sm font-semibold'>Dashboard</p>
            </div>
            <div className='flex items-center gap-2'>
                <ModeToggle />
            </div>
        </div>
    </div>
  )
}

export default MyNavbar