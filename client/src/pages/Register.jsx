import React from 'react';
import { Button, Form, Container } from 'react-bootstrap';

console.log("Register Component Mounted")

const Register = () => {
  return (
    <Container className="mt-5">
      <h2 className="mb-4">Register</h2>
      <Form>
        <Form.Group className="mb-3" controlId="formBasicEmail">
          <Form.Label>Email address</Form.Label>
          <Form.Control type="email" placeholder="Enter email" />
        </Form.Group>

        <Form.Group className="mb-3" controlId="formBasicPassword">
          <Form.Label>Password</Form.Label>
          <Form.Control type="password" placeholder="Password" />
        </Form.Group>

        <Button variant="success" type="submit">
          Let's Go
        </Button>
      </Form>
    </Container>
  );
};

export default Register;
