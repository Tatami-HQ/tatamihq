# Database Schema (Supabase)

## Students
- id (auto, UUID)  
- first_name (text)  
- last_name (text)  
- dob (date of birth)  
- belt_level (text: white, yellow, etc.)  
- start_date (date joined)  
- status (active / inactive)  

## Classes
- id (auto)  
- class_name (text, e.g. Kids Kickboxing)  
- age_group (text, e.g. 5–9)  
- day (text)  
- time (text)  
- coach_id (links to Coaches.id)  

## Attendance
- id (auto)  
- student_id (links to Students.id)  
- class_id (links to Classes.id)  
- date (date of class)  
- status (present / absent)  

## Payments
- id (auto)  
- student_id (links to Students.id)  
- amount (£)  
- date_paid (date)  
- status (paid / missed / pending)  
- stripe_payment_id (optional)  

## Coaches
- id (auto)  
- name (text)  
- role (text: Head Coach, Assistant)  
- email (text)  
