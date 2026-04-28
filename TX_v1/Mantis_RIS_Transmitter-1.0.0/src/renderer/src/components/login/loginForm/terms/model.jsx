import React, { useEffect, useState } from "react";
import styles from "./model.module.css";

const Model = ({ setIsModel }) => {
  const [agree, setAgree] = useState(false);

  const handleAccept = () => {
    setAgree(!agree);
  };

  const handleContinue = () => {
    if (agree) {
      setIsModel(false);
    }
  };

  return (
    <div className={styles.model}>
      <div className={styles.body}>
        <div className={styles.text}>
        <div className={styles.terms}>
            <h2>Terms and Conditions</h2>
            <h3>1. Licensing and Permissions</h3>
            <p>
              <strong>User Responsibility for Licensing:</strong> The user is
              solely responsible for obtaining and maintaining all necessary
              licenses, authorizations, and regulatory approvals required to
              operate the 5G Box. The manufacturer assumes no responsibility for
              any noncompliance with spectrum regulations or licensing
              requirements.
            </p>
            <p>
              <strong>No License Warranty:</strong> The manufacturer does not
              warrant that the NiB complies with any specific national or
              international licensing requirements. Users are fully liable for
              any violation of telecommunications or spectrum laws.
            </p>
            <br />
            <h3>2. RF Spectrum for Testing</h3>
            <p>
              The Mantis Private 5G Network-in-a-Box operates within any 3GPP
              Time Division Duplex (TDD) band in Frequency Range 1 (below 6GHz),
              with a maximum gNodeB (gNB) transmission power of 10 dBm. The
              system permits the configuration of the central frequency to avoid
              interference with frequencies utilized by local Mobile Network
              Operators.
            </p>
            <p>
              Before deploying the Mantis Private 5G Network-in-a-Box, users
              must obtain a trial RF license from the relevant authority.
              Without such a license, users may conduct 5G testing through an RF
              cable kit or in an anechoic chamber to prevent over-the-air
              transmission. Alternatively, testing can be conducted within a
              Faraday cage to contain RF emissions.
            </p>
            <br />
            <h3>3. Compliance with Local Regulations</h3>
            <p>
              <strong>User Obligation for Legal Compliance:</strong> The user
              agrees to comply with all local, national, and international
              regulations, including but not limited to spectrum use, data
              protection laws, and telecommunications policies. The manufacturer
              disclaims all liability related to the improper or illegal use of
              the NiB.
            </p>
            <p>
              <strong>
                No Manufacturer Responsibility for Regulatory Breaches:
              </strong>{" "}
              The manufacturer cannot be held liable for any fines, penalties,
              or legal consequences arising from the user’s failure to comply
              with local regulations, including spectrum violations or data
              privacy breaches.
            </p>
            <br />
            <h3>4. Liability and Indemnification</h3>
            <p>
              <strong>Limited Manufacturer Liability:</strong> The
              manufacturer’s liability for any claim related to the use or
              performance of the NiB is strictly limited to the amount paid by
              the user for the product. The manufacturer shall not be liable for
              indirect, incidental, special, punitive, or consequential damages.
            </p>
            <p>
              <strong>Indemnity Clause:</strong> The user agrees to indemnify,
              defend, and hold harmless the manufacturer from any claims,
              losses, damages, fines, or legal costs arising out of (i) the
              user’s breach of these terms, (ii) the user’s misuse of the NiB,
              (iii) the user’s violation of any laws, regulations, or
              third-party rights.
            </p>
            <br />
            <h3>5. Acceptable Use Policy</h3>
            <p>
              <strong>Prohibited Use:</strong> The NIB may not be used in any
              manner that violates local laws, including but not limited to
              unauthorized surveillance, intercepting communications, or
              hacking.
            </p>
            <p>
              <strong>Security Responsibility:</strong> The user is solely
              responsible for implementing sufficient security measures (e.g.,
              encryption, firewall protection) to prevent unauthorized access to
              the NiB. The manufacturer disclaims any responsibility for
              breaches or data loss resulting from inadequate security.
            </p>
            <br />
            <h3>6. Warranty and Maintenance</h3>
            <p>
              <strong>Limited Warranty:</strong> The NiB is provided “as is”
              with a limited hardware warranty for one year from purchase date.
              This warranty covers only manufacturer defects and does not cover
              misuse, improper installation, modifications, or external factors
              such as environmental damage or power surges.
            </p>
            <p>
              <strong>No Software Warranty:</strong> The manufacturer makes no
              warranties, either express or implied, regarding the software that
              accompanies the NiB, including its fitness for a particular
              purpose, bug-free performance, or its compatibility with
              user-specific applications.
            </p>
            <p>
              <strong>User Responsibility for Maintenance:</strong> Users are
              responsible for all regular maintenance, and the manufacturer
              assumes no responsibility for system downtime, malfunctions, or
              the need for updates or repairs beyond the initial warranty
              period.
            </p>
            <br />
            <h3>7. Service-Level Agreement (SLA) Disclaimer</h3>
            <p>
              <strong>No SLA Guarantee:</strong> The manufacturer makes no
              guarantees regarding network performance metrics, including
              uptime, data throughput, latency, or overall service quality,
              particularly in environments where external interference,
              insufficient bandwidth, or improper deployment affect network
              performance.
            </p>
            <p>
              <strong>No Liability for Performance Failures:</strong> The
              manufacturer is not liable for failure to meet any performance
              standards in the NiB due to external factors beyond its control,
              including but not limited to user configuration errors,
              interference from other wireless devices, and environmental
              obstacles.
            </p>
            <br />
            <h3>8. Termination of Use</h3>
            <p>
              <strong>Termination Rights:</strong> The manufacturer reserves the
              right to terminate the customer support related to the product at
              any time, without prior notice, if the user is found in violation
              of these terms. The manufacturer shall not be liable for any
              losses or damages resulting from such termination.
            </p>
            <p>
              <strong>No Refund upon Termination:</strong> Upon termination of
              the agreement, the user shall not be entitled to any refund for
              unused portions of the service or product.
            </p>
            <p>
              <strong>Obligation to Decommission:</strong> The user agrees to
              cease operation of the NiB immediately upon termination and, where
              applicable, return any hardware or software licenses associated
              with the product.
            </p>
            <br />
            <h3>9. Intellectual Property Rights</h3>
            <p>
              <strong>Non-Transferable License:</strong> The user is granted a
              non-exclusive, non-transferable right to use the NiB under the
              terms stipulated. All intellectual property rights, including
              patents, copyrights, and trade secrets, remain with the
              manufacturer.
            </p>
            <p>
              <strong>No Right to Modify or Reverse Engineer:</strong> The user
              agrees not to modify, reverse engineer, disassemble the hardware
              associated with the product. Any unauthorized modification will
              result in immediate termination of the customer support for the
              product.
            </p>
            <br />
            <h3>10. Limitation of Support Services</h3>
            <p>
              <strong>No Obligation for Extended Support:</strong> Beyond the
              initial one-year warranty period, the manufacturer is not
              obligated to provide software updates, patches, or extended
              support. Any additional support may be subject to separate fees
              and agreements.
            </p>
            <p>
              <strong>Paid Support Services:</strong> After the warranty period,
              users must enter into a separate service agreement with the
              manufacturer for technical support or maintenance, which may
              include additional fees. During the warranty period, any
              additional support required for fixing problem due to mishandling
              of the box will be paid.
            </p>
            <br />
            <h3>11. Force Majeure</h3>
            <p>
              <strong>Exclusion from Liability:</strong> The manufacturer will
              not be liable for delays, interruptions, or failures in the
              performance of the NiB caused by circumstances beyond its control,
              including natural disasters, governmental actions, labor disputes,
              supply chain disruptions, or technical failures not attributable
              to the manufacturer.
            </p>
            <br />
            <h3>Acknowledgment</h3>
            <p>
              Using the NiB, the user acknowledges that they have read,
              understood, and agreed to these terms and conditions. The user
              also agrees to bear all responsibilities arising from using the
              product, including any legal or regulatory consequences, and holds
              the manufacturer harmless for any claims arising from the
              operation or misuse of the NiB.
            </p>
            <br />
            Agree Terms and Conditions:
            <br />
          </div>
          <div
            className={styles.agreement}
            style={{ width: "30%"}}
          >
            <div className={styles.checkboxContainer}>
                <input
                  type="checkbox"
                  className={styles.check}
                  onChange={handleAccept}
                />
                <label className={styles.label}>Agree</label>
              </div>

            <div
              className={styles.conti}
              style={
                agree
                  ? { cursor: "pointer" }
                  : {
                      backgroundColor: "#555f75",
                      cursor: "not-allowed",
                      color: "grey",
                    }
              }
              onClick={agree ? handleContinue : null}
            >
              Continue
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Model;
