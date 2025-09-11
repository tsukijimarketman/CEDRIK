import { useState } from "react";
import "./TrueOrFalse.css";

const TrueOrFalse = () => {
  const [selectedAnswers, setSelectedAnswers] = useState({});

  const handleChange = (index, value) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [index + 1]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Selected answers:", selectedAnswers);
  };

  const question = [
    "Which planet is known as the Red Planet?",
    "What does CPU stand for?",
    "Who painted the Mona Lisa?",
    "Sino ang Boss ng Sys Dev?",
  ];

  const answers = [
    ["Venus", "Mars", "Jupiter", "Saturn"],
    [
      "Central Process Unit",
      "Computer Power Utility",
      "Central Program Unit",
      "Control Processing Utility",
    ],
    ["Gerick Velasquez", "Real Sullera", "Rico Orot", "Leonardo Da Vinci"],
    [
      "Gerick Velasquez",
      "Gerick Velasquez",
      "Gerick Velasquez",
      "Gerick Velasquez",
    ],
  ];

  return (
    <>
      <div>
        <div className="tof-container">
          <form className="tof-inner-container" onSubmit={handleSubmit}>
            <ul>
              {question.map((question, index) => (
                <li key={index}>
                  <h3 className="tof-questions">{`${
                    index + 1
                  }. ${question}`}</h3>
                  <div className="tof-answers">
                    <label htmlFor="tof-choices">
                      <input
                        type="radio"
                        name={`question-${index}`}
                        className="tof-buttons"
                        onChange={() => handleChange(index, "True")}
                      />
                      <span className="checkmark"></span>
                      True
                    </label>

                    <label htmlFor="tof-choices">
                      <input
                        type="radio"
                        name={`question-${index}`}
                        className="tof-buttons"
                        onChange={() => handleChange(index, "False")}
                      />
                      <span className="checkmark"></span>
                      False
                    </label>
                  </div>
                </li>
              ))}

              <button type="submit" className="submit-button">
                Submit
              </button>
            </ul>
          </form>
        </div>
      </div>
    </>
  );
};

export default TrueOrFalse;
