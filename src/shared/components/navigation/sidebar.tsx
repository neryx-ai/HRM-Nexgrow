import React from 'react'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenuItem, SidebarSeparator } from '../ui/sidebar'
import Link from 'next/link'
import { Button } from '../ui/button'
import { BookUser, Building2, ChartArea, LayoutDashboard, Settings, TreePalm, Wallet } from 'lucide-react'

function MySidebar() {
  return (
    <Sidebar variant='floating'>
      <SidebarHeader>
        <h2 className='text-lg font-semibold m-auto py-3'>LOGO</h2>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup className='space-y-2'>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenuItem>
            <Button variant="ghost" className='w-full justify-start text-base'>
              <LayoutDashboard className='size-5' />
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Button variant="ghost" className='w-full justify-start text-base'>
              <BookUser className='size-5' />
              <Link href="/employees">Empleados</Link>
            </Button>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Button variant="ghost" className='w-full justify-start text-base'>
              <Building2 className='size-5' />
              <Link href="/branches">Sucursales</Link>
            </Button>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Button variant="ghost" className='w-full justify-start text-base'>
              <Wallet className='size-5' />
              <Link href="/payroll">Planilla</Link>
            </Button>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Button variant="ghost" className='w-full justify-start text-base'>
              <TreePalm className='size-5' />
              <Link href="/vacations">Vacaciones</Link>
            </Button>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Button variant="ghost" className='w-full justify-start text-base'>
              <ChartArea className='size-5' />
              <Link href="/check-in-out">Check In/Out</Link>
            </Button>
          </SidebarMenuItem>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenuItem>
            <Button variant="ghost" className='w-full justify-start text-base'>
              <Settings className='size-5' />
              <Link href="/settings">Configuración</Link>
            </Button>
          </SidebarMenuItem>
      </SidebarFooter>
    </Sidebar>
  )
}

export default MySidebar