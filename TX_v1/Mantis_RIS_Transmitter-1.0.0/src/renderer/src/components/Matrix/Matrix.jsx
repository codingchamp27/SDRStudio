import React, { useContext, useEffect, useState } from "react";
import useMatrixReceiver from "./MatrixReciever/MatrixReceiver";
import { DataContext } from "../Context/DataContext";
import styles from "./Matrix.module.css";

const SIZE = 16;
const OFF_COLOR = "#ffffff";
const ON_COLOR = "#F36F41";

export default function ReceiverComponent() {

  const {setHex, setMatrixType, setReceiverStatus} = useContext(DataContext); 

  const [matrix2, setMatrix2] = useState(
    Array.from({ length: SIZE }, () =>
      Array.from({ length: SIZE }, () => OFF_COLOR)
    )
  );

  useMatrixReceiver(setMatrix2, setMatrixType, setReceiverStatus, "matrices");

  function matrixToHex(matrix = matrix2, { prefix = "!0X" } = {}) {
    if (
      !matrix ||
      !Array.isArray(matrix) ||
      matrix.length !== SIZE ||
      !matrix.every((row) => Array.isArray(row) && row.length === SIZE)
    ) {
      return null;
    }

    const isOn = (cell) => {
      if (cell === ON_COLOR) return true;
      if (cell === true) return true;
      if (cell === 1) return true;
      if (String(cell).trim() === "1") return true;
      return false;
    };

    let hexStr = "";

    for (let col = 0; col < SIZE; col++) {
      let bits = "";
      for (let row = 0; row < SIZE; row++) {
        const cell = matrix[row][col];
        bits += isOn(cell) ? "1" : "0";
      }
      const num = parseInt(bits, 2) || 0;
      hexStr += num.toString(16).padStart(4, "0").toUpperCase();
    }

    return prefix ? `${prefix}${hexStr}` : hexStr;
  }

  useEffect(() => {
    setHex(matrixToHex(matrix2));
  }, [matrix2]);

  return (
    <div className={styles.matrixGrid}
        style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}>
      {matrix2?.flatMap((row, r) =>
        row.map((cell, c) => (
          <div
            key={`${r}-${c}`}
            className={styles.cell}
            style={{
              backgroundColor: cell,
            }}
          />
        ))
      )}
    </div>

    //   <section className={styles.matrixWrapper}>
    // <div className={styles.matrixGrid}
    //     style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}>
    //   {matrix2?.flatMap((row, r) =>
    //     row.map((cell, c) => (
    //       <div
    //         key={`${r}-${c}`}
    //         className={styles.cell}
    //         style={{ background: cell || OFF_COLOR }}
    //       />
    //     ))
    //   )}

    //   {/* <input type="string" style={{width: "700px"}} value={hex} ></input> */}
    // </div>
    // </section>

  );
}
