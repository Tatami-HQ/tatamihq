#!/usr/bin/env node

/**
 * Script to populate clubs_id and location_id across all tables
 * Run with: node populate-clubs-locations.js
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: './web/.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in web/.env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function populateClubsAndLocations() {
  console.log('🚀 Starting to populate clubs_id and location_id across all tables...\n')
  console.log('🎯 Assigning all members to Braveheart Martial Arts (club_id = 1) and location_id = 1\n')

  try {
    // Use specific club and location IDs as requested
    const clubId = 1  // Braveheart Martial Arts
    const locationId = 1

    console.log(`📋 Using Club ID: ${clubId} (Braveheart Martial Arts)`)
    console.log(`📍 Using Location ID: ${locationId}`)

    // Verify the club and location exist
    const { data: clubData, error: clubError } = await supabase
      .from('clubs')
      .select('clubs_id, name')
      .eq('clubs_id', clubId)
      .single()

    if (clubError || !clubData) {
      console.error(`❌ Club with ID ${clubId} not found. Please create it first.`)
      return
    }
    console.log(`✅ Found club: ${clubData.name}`)

    const { data: locationData, error: locationError } = await supabase
      .from('location')
      .select('location_id, name')
      .eq('location_id', locationId)
      .single()

    if (locationError || !locationData) {
      console.error(`❌ Location with ID ${locationId} not found. Please create it first.`)
      return
    }
    console.log(`✅ Found location: ${locationData.name}`)

    // Step 3: Update all tables
    const tablesToUpdate = [
      { name: 'members', fields: ['clubs_id', 'location_id'] },
      { name: 'competition_coaches', fields: ['clubs_id', 'location_id'] },
      { name: 'competition_bouts', fields: ['clubs_id', 'location_id'] },
      { name: 'competitions', fields: ['clubs_id', 'location_id'] },
      { name: 'competition_entries', fields: ['clubs_id', 'location_id'] },
      { name: 'profiles', fields: ['clubs_id', 'location_id'] }
    ]

    console.log('\n📋 Step 3: Updating all tables...')

    for (const table of tablesToUpdate) {
      console.log(`\n🔄 Updating ${table.name}...`)
      
      // Check if table has the required fields
      const { data: sampleData, error: sampleError } = await supabase
        .from(table.name)
        .select('*')
        .limit(1)

      if (sampleError) {
        console.log(`⚠️  Skipping ${table.name} - table may not exist or no access: ${sampleError.message}`)
        continue
      }

      // Update records where clubs_id or location_id is null
      const updateData = {}
      if (table.fields.includes('clubs_id')) updateData.clubs_id = clubId
      if (table.fields.includes('location_id')) updateData.location_id = locationId

      const { error: updateError } = await supabase
        .from(table.name)
        .update(updateData)
        .or(`clubs_id.is.null,location_id.is.null`)

      if (updateError) {
        console.log(`⚠️  Error updating ${table.name}: ${updateError.message}`)
      } else {
        console.log(`✅ Updated ${table.name}`)
      }
    }

    console.log('\n🎉 All done! All tables have been populated with clubs_id and location_id.')
    console.log(`📊 All members assigned to Club ID: ${clubId} (Braveheart Martial Arts)`)
    console.log(`📍 All members assigned to Location ID: ${locationId}`)
    console.log('\n✅ Your step-in coach selection should now work properly!')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the script
populateClubsAndLocations()
