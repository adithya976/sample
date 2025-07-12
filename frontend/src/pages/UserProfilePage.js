import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const UserProfilePage = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box>
        <Typography variant="h4" gutterBottom>
          User Profile
        </Typography>
        <Typography variant="body1" color="text.secondary">
          User profile page is under construction. You can view other users' profiles and their skills here.
        </Typography>
      </Box>
    </Container>
  );
};

export default UserProfilePage;