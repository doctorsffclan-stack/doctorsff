import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD041aAIZVT-Ur1jKaufSxetJ9GhaJ24DY",
  authDomain: "doctors-78a4a.firebaseapp.com",
  projectId: "doctors-78a4a",
  storageBucket: "doctors-78a4a.firebasestorage.app",
  messagingSenderId: "339442193322",
  appId: "1:339442193322:web:12e4006811ebc996c191d3",
  measurementId: "G-1CM9BQ1DSD"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
