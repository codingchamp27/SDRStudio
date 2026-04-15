import React, { useEffect, useRef } from "react";
import { ref, set, update } from "firebase/database";
import { db } from "./FirebaseClient";

const SIZE = 10;
const MATRIX_PATH = "matrices/matrixA";

const makeOffMatrix = (size, OFF_COLOR) =>
  Array.from({ length: size }, () => Array.from({ length: size }, () => OFF_COLOR));

export default function Writer({ matrix1, filterTypeRef }) {
  const prevRef = useRef(null);

  useEffect(() => {
    prevRef.current = prevRef.current ?? matrix1;
  }, []);

  const handleUpdate = async () => {
    const pathRef = ref(db, MATRIX_PATH);

      const oldM = prevRef.current;
      const newM = matrix1;
      const updates = {};
      let changed = false;
      console.log(newM);
      for (let r = 0; r < newM.length; r++) {
        for (let c = 0; c < newM[r].length; c++) {
          const oldVal = oldM?.[r]?.[c];
          const newVal = newM[r][c];
          if (oldVal !== newVal) {
            updates[`matrix/${r}/${c}`] = newVal;
            changed = true;
          }
        }
      }

      updates["metadata/ts"] = Date.now();
      updates["metadata/filterType"] = filterTypeRef.current ?? "all";

      if (changed) {
        await update(pathRef, updates);
        prevRef.current = JSON.parse(JSON.stringify(newM));
        console.log("Sent diff updates:", Object.keys(updates).length);
      } else {
        await update(pathRef, { "metadata/ts": Date.now() });
      }
  }

  useEffect(() => {

    handleUpdate();

  }, [matrix1, filterTypeRef]);

  return null;
}
