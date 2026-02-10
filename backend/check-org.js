const axios = require('axios');

async function checkOrg() {
  try {
    console.log('🔍 Checking organizations via API...');

    const response = await axios.get('http://localhost:3001/api/admin/organizations', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InN1cGVyYWRtaW4tMSIsImVtYWlsIjoic3VwZXJhZG1pbkBteWxhYi5pbyIsInJvbGUiOiJQbGF0Zm9ybUFkbWluIiwiaWF0IjoxNzcwNTYxNDcyLCJleHAiOjE3NzA2NDc4NzJ9.MT_f91I5AOEME6lFDqtvTXIIZz0oqbdiOecF1uooK84'
      }
    });

    const orgs = response.data.organizations || [];
    console.log('Found', orgs.length, 'organizations');

    const techLab = orgs.find(org => org.name === 'TechLab Solutions');
    if (techLab) {
      console.log('✅ TechLab Solutions found:', {
        id: techLab.id,
        name: techLab.name,
        workspace_id: techLab.workspace_id,
        plan_name: techLab.plan_name,
        subscription_status: techLab.subscription_status
      });

      // Now check users in this workspace
      console.log('🔍 Checking users in workspace...');
      const userResponse = await axios.get(`http://localhost:3001/api/admin/users?workspaceId=${techLab.workspace_id}`, {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InN1cGVyYWRtaW4tMSIsImVtYWlsIjoic3VwZXJhZG1pbkBteWxhYi5pbyIsInJvbGUiOiJQbGF0Zm9ybUFkbWluIiwiaWF0IjoxNzcwNTYxNDcyLCJleHAiOjE3NzA2NDc4NzJ9.MT_f91I5AOEME6lFDqtvTXIIZz0oqbdiOecF1uooK84'
        }
      });

      const users = userResponse.data.users || [];
      console.log('Users in TechLab workspace:', users.length);

      if (users.length > 0) {
        users.forEach(user => {
          console.log('  -', user.email, '(role:', user.role + ')');
        });
      } else {
        console.log('❌ No users found in TechLab workspace!');
      }

    } else {
      console.log('❌ TechLab Solutions not found in API response');
    }

  } catch (error) {
    console.error('❌ API Error:', error.response?.data || error.message);
  }
}

checkOrg();