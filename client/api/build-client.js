import axios from 'axios';

export default ({ req }) => {
  if (typeof window === 'undefined') {
    // We are on the server
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    return axios.create({
      baseURL: 'https://ingress-nginx-controller.ingress-nginx.svc.cluster.local',
      headers: req.headers
    });
  } else {
    // We must be on the browser
    return axios.create({
      baseUrl: '/'
    });
  }
};
