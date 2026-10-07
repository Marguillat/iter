'use client'

import { Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import customersData from './data.json'
import type { RecentCustomerRow } from './recent-customers-table/schema'
import { RecentCustomersTable } from './recent-customers-table/table'

const DPP = customersData as RecentCustomerRow[]
const sumDPP = DPP.length // TODO changer les schema
export function SubscriberOverview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='leading-none'>
          {sumDPP} Passport numériques
        </CardTitle>
        <CardDescription>
          Métadonnées des passport numériques produits: publiés, complétés, pays
          de fabrication
        </CardDescription>
        <CardAction>
          <Button variant='outline' size='sm'>
            <Download />
            Export
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className='pt-0'>
        <RecentCustomersTable data={DPP} />
      </CardContent>
    </Card>
  )
}
