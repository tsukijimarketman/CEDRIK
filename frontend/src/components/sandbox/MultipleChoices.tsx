import { useState } from "react";
import "./MultipleChoices.css";

const MultipleChoices = () => {

  const [selectedAnswers, setSelectedAnswers] = useState({});

  const handleChange = (index, value) => {
    setSelectedAnswers((prev)=>({
      ...prev, [index + 1]:value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Selected answers:", selectedAnswers);
  }

  const question = [
    "Which planet is known as the Red Planet?",
    "What does CPU stand for?",
    "Who painted the Mona Lisa?",
    "Sino ang Boss ng Sys Dev?"
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
     ["Gerick Velasquez", "Gerick Velasquez", "Gerick Velasquez", "Gerick Velasquez"],
  ];

  return (
    <>
      <div>
        <div className="multiple-choices-container">
          <form className="inner-container" onSubmit={handleSubmit}>
            <ul>
              {question.map((question, index) => (
                <li key={index}>
                  <h3 className="questions">{`${index+1}. ${question}`}</h3>
                  {answers[index].map((answer, i) => (
                    <li key={i}>
                      <div className="answers">
                        <label htmlFor="choices">
                          <input
                            type="radio"
                            name={`question-${index}`}
                            className="multiple-buttons"
                            onChange={()=>handleChange(index, answer)}
                          />
                          <span className="checkmark"></span>
                          {answer}
                        </label>
                      </div>
                    </li>
                  ))}
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

export default MultipleChoices;
