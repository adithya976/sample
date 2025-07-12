import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const BrowseUsersPage = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Browse Users
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Browse users page is under construction. You can search and discover other users and their skills here.
        </Typography>
      </Box>
    </Container>
  );
};

export default BrowseUsersPage;