import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import Router from 'next/router';
import useRequest from '../../hooks/use-request';

const stripePromise = loadStripe('pk_test_51SRHtcLqIoLNHTWJxVcM6N7DYY7KmWDIz0bJ4tszPICukIK8lTfDsA5yhqYDXqvsSzyRFejHWz9eVFxVMHIU3OWK00GO7MhUVB');

const CheckoutForm = ({ order, doRequest }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error, token } = await stripe.createToken(elements.getElement(CardElement));
    if (error) {
      setError(error.message);
      setProcessing(false);
      return;
    }

    await doRequest({ token: token.id });
    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="border p-4 rounded mb-4">
        <CardElement options={{ hidePostalCode: true }} />
      </div>
      <button
        disabled={!stripe || processing}
        className="btn btn-primary"
        type="submit"
      >
        {processing ? 'Processing...' : 'Pay'}
      </button>
      {error && <div className="text-danger mt-2">{error}</div>}
    </form>
  );
};


const OrderShow = ({ order, currentUser }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const { doRequest, errors } = useRequest({
    url: '/api/payments',
    method: 'post',
    body: {
      orderId: order.id,
    },
    onSuccess: () => Router.push('/orders'),
  });

  useEffect(() => {
    const findTimeLeft = () => {
      const msLeft = new Date(order.expiresAt) - new Date();
      setTimeLeft(Math.round(msLeft / 1000));
    };

    findTimeLeft();
    const timerId = setInterval(findTimeLeft, 1000);

    return () => {
      clearInterval(timerId);
    };
  }, [order]);

  if (timeLeft < 0) {
    return <h3 className="mt-4">Order Expired</h3>;
  }

  return (
    <div className="mt-4">
      <h4 className="mb-4">Time left to pay: {timeLeft} seconds</h4>
      <Elements stripe={stripePromise}>
        <CheckoutForm order={order} doRequest={doRequest} />
      </Elements>
      {errors}
    </div>
  );
};

OrderShow.getInitialProps = async (context, client) => {
  const { orderId } = context.query;
  const { data } = await client.get(`/api/orders/${orderId}`);

  return { order: data };
};

export default OrderShow;
