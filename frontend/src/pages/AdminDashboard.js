import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const AdminDashboard = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Admin Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Admin dashboard is under construction. You can manage users, skills, and platform settings here.
        </Typography>
      </Box>
    </Container>
  );
};

export default AdminDashboard;