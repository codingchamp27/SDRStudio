import { useEffect } from "react";
import { db } from "../../firebase/FirebaseClient";
import { ref as dbRef, onValue, off } from "firebase/database";

export default function useMatrixReceiver(setMatrix, setMatrixType, setReceiverStatus, path = "matrices") {
  useEffect(() => {
    const matrixRef = dbRef(db, `${path}`);

    const unsubscribe = onValue(matrixRef, (snapshot) => {
      const data = snapshot.val();
      console.log(data);
      if (data?.matrixA?.matrix) {
        console.log("updated matrix", data);
        setMatrix(data?.matrixA.matrix);
        setMatrixType(data?.matrixA?.metadata?.filterType);
        setReceiverStatus(data?.receiver.status);
      }
    });

    return () => {
      off(matrixRef);
      unsubscribe?.();
    };
  }, [path, setMatrix]);
}
