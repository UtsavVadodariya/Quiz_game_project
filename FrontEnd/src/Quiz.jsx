import { useState, useEffect } from 'react';
import axios from 'axios';

const ConfettiPiece = ({ delay }) => (
  <div
    className="fixed w-2 h-2 bg-yellow-400 rounded-full animate-pulse"
    style={{
      left: `${Math.random() * 100}%`,
      top: '-10px',
      animationDelay: `${delay}s`,
      transform: 'translateY(100vh)',
      transition: 'transform 3s ease-in',
    }}
  />
);

const CustomConfetti = ({ show, intensity = 50 }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {[...Array(intensity)].map((_, i) => (
        <ConfettiPiece key={i} delay={Math.random() * 2} />
      ))}
    </div>
  );
};

function Quiz() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [userAnswer, setUserAnswer] = useState(null);
  const [matchAnswers, setMatchAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(30);
  const [totalTime, setTotalTime] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Google Sheets API configuration
  const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
  const SHEET_ID = import.meta.env.VITE_SHEET_ID;
  const SHEET_NAME = 'QuizQuestions';
  // const API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}!A1:H100?key=${API_KEY}`;
  const API_URL = `https://sheets.googleapis.com/v4/spreadsheets/1EYl6FfWhgxVS6uMUji0KoOfZebWFDK4beWM-RalvgN4/values/${SHEET_NAME}!A1:H100?key=AIzaSyBklmWuNonV6FDAFmPGU0nduohTU_E7FnA`;
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        console.log("response", API_URL);
        const response = await axios.get(API_URL);

        const rows = response.data.values;
        if (!rows || rows.length < 2) {
          throw new Error('No data found in the Google Sheet');
        }
        console.log("rows", rows);

        const headers = rows[0]; // First row is headers
        const fetchedQuestions = rows.slice(1).map((row, index) => ({
          id: parseInt(row[0]), // ID
          language: row[1], // Language
          category: row[2], // Category
          type: row[3], // Type
          question: row[4], // Question
          options: row[5] ? JSON.parse(row[5]) : [], // Options 
          correctAnswer: row[3] === 'trueFalse' ? row[6] === 'true' : row[3] === 'matchTheFollowing' ? JSON.parse(row[6]) : row[6], // CorrectAnswer
          pairs: row[7] ? JSON.parse(row[7]) : [], // Pairs
        }));

        setQuestions(fetchedQuestions);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch questions from Google Sheet. Please check the Sheet ID, API Key, or sheet permissions.');
        setLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  const filteredQuestions = selectedCategory && selectedLanguage
    ? questions.filter((q) => q.category === selectedCategory && q.language === selectedLanguage)
    : [];

  const currentQuestion = filteredQuestions[currentQuestionIndex];

  useEffect(() => {
    if (timeLeft > 0 && !quizCompleted && selectedCategory && selectedLanguage) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
        setTotalTime(totalTime + 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && selectedCategory && selectedLanguage) {
      handleNextQuestion();
    }
  }, [timeLeft, quizCompleted, selectedCategory, selectedLanguage, totalTime]);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setSelectedLanguage(null);
    setCurrentQuestionIndex(0);
    setScore(0);
    setUserAnswer(null);
    setMatchAnswers({});
    setTimeLeft(30);
    setTotalTime(0);
    setQuizCompleted(false);
    setFeedback('');
    setShowConfetti(false);
  };

  const handleLanguageSelect = (language) => {
    setSelectedLanguage(language);
    setCurrentQuestionIndex(0);
    setScore(0);
    setUserAnswer(null);
    setMatchAnswers({});
    setTimeLeft(30);
    setTotalTime(0);
    setQuizCompleted(false);
    setFeedback('');
    setShowConfetti(false);
  };

  const handleAnswer = (answer) => {
    setUserAnswer(answer);
    if (currentQuestion.type === 'matchTheFollowing') {
      setMatchAnswers({ ...matchAnswers, [answer.question]: answer.answer });
    }
  };

  const checkAnswer = () => {
    let isCorrect = false;
    if (currentQuestion.type === 'mcq' || currentQuestion.type === 'trueFalse') {
      isCorrect = userAnswer === currentQuestion.correctAnswer;
    } else if (currentQuestion.type === 'fillInTheBlank') {
      isCorrect = userAnswer.trim().toLowerCase() === currentQuestion.correctAnswer.toLowerCase();
    } else if (currentQuestion.type === 'matchTheFollowing') {
      isCorrect = JSON.stringify(matchAnswers) === JSON.stringify(
        currentQuestion.correctAnswer.reduce((acc, pair) => {
          acc[pair.question] = pair.answer;
          return acc;
        }, {})
      );
    }
    if (isCorrect) {
      setScore(score + 1);
      setFeedback('Correct! ✅');
    } else {
      setFeedback('Incorrect! ❌');
    }
    setTimeout(handleNextQuestion, 1500);
  };

  const handleNextQuestion = () => {
    setFeedback('');
    setUserAnswer(null);
    setMatchAnswers({});
    setTimeLeft(30);
    if (currentQuestionIndex < filteredQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setQuizCompleted(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  };

  const restartQuiz = () => {
    setCurrentQuestionIndex(0);
    setScore(0);
    setUserAnswer(null);
    setMatchAnswers({});
    setTimeLeft(30);
    setTotalTime(0);
    setQuizCompleted(false);
    setFeedback('');
    setShowConfetti(false);
  };

  const goBackToCategorySelection = () => {
    setSelectedCategory(null);
    setSelectedLanguage(null);
    setCurrentQuestionIndex(0);
    setScore(0);
    setUserAnswer(null);
    setMatchAnswers({});
    setTimeLeft(30);
    setTotalTime(0);
    setQuizCompleted(false);
    setFeedback('');
    setShowConfetti(false);
  };

  const getCelebrationEmojis = (score, total) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return '🥳🎉🏆';
    if (percentage >= 50) return '😊👍⭐';
    return '😐💪';
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const getLanguageEmoji = (language) => {
    const emojis = {
      'English': '🇬🇧',
      'Hindi': '🇮🇳',
      'Gujarati': '🟧',
      'Sanskrit': '🕉️'
    };
    return emojis[language] || '🌍';
  };

  const getCategoryEmoji = (category) => {
    const emojis = {
      'Math': '➕',
      'Science': '🔬',
      'General': '🌍'
    };
    return emojis[category] || '📚';
  };

  const getScoreColor = (score, total) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-2xl font-semibold text-gray-800">Loading questions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
          <p className="text-gray-600 mt-2">Please ensure the Google Sheet is publicly accessible, Sheet ID, API Key, and sheet name are correct.</p>
        </div>
      </div>
    );
  }

  if (!selectedCategory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full transform hover:scale-105 transition-transform duration-300">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">📚 Quiz Game</h1>
            <p className="text-gray-600 text-lg">Choose a category to start</p>
          </div>
          <div className="space-y-4">
            {['Math', 'Science', 'General'].map((category) => (
              <button
                key={category}
                onClick={() => handleCategorySelect(category)}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 hover:from-blue-600 hover:to-purple-700"
              >
                <span className="text-2xl">{getCategoryEmoji(category)}</span>
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!selectedLanguage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full transform hover:scale-105 transition-transform duration-300">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">🌍 {selectedCategory} Quiz</h1>
            <p className="text-gray-600 text-lg">Choose your language</p>
          </div>
          <div className="space-y-4">
            {['English', 'Hindi', 'Gujarati', 'Sanskrit'].map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageSelect(lang)}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 hover:from-blue-600 hover:to-purple-700"
              >
                <span className="text-2xl">{getLanguageEmoji(lang)}</span>
                {lang}
              </button>
            ))}
          </div>
          <div className="text-center mt-6">
            <button
              onClick={goBackToCategorySelection}
              className="px-6 py-3 bg-gray-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              ⬅ Back to Category
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (quizCompleted) {
    const percentage = (score / filteredQuestions.length) * 100;
    const emojis = getCelebrationEmojis(score, filteredQuestions.length);
    const scoreColor = getScoreColor(score, filteredQuestions.length);

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
        <CustomConfetti show={showConfetti} intensity={percentage >= 80 ? 100 : 50} />
        <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
          {[...Array(percentage >= 80 ? 10 : percentage >= 50 ? 5 : 3)].map((_, i) => (
            <div
              key={i}
              className="w-12 h-16 bg-red-400 rounded-full animate-balloon"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full text-center transform hover:scale-105 transition-transform duration-300">
          <div className="mb-6">
            <div className="text-6xl mb-4 animate-bounce">{emojis}</div>
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Quiz Completed!</h1>
          </div>
          <div className="bg-gray-50 rounded-2xl p-6 mb-6 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-semibold">Score:</span>
              <span className={`text-2xl font-bold ${scoreColor}`}>
                {score} / {filteredQuestions.length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-semibold">Percentage:</span>
              <span className={`text-xl font-bold ${scoreColor}`}>
                {percentage.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-semibold">Time:</span>
              <span className="text-xl font-bold text-gray-800">
                {formatTime(totalTime)}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={restartQuiz}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              🔄 Restart Quiz
            </button>
            <button
              onClick={goBackToCategorySelection}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              ⬅ Back to Category
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {getCategoryEmoji(selectedCategory)} {selectedCategory} Quiz {getLanguageEmoji(selectedLanguage)}
          </h1>
          <div className="flex justify-center gap-6 text-sm">
            <div className="bg-red-100 text-red-700 px-4 py-2 rounded-full font-semibold">
              ⏰ {timeLeft}s
            </div>
            <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-semibold">
              🎯 Score: {score}
            </div>
            <div className="bg-purple-100 text-purple-700 px-4 py-2 rounded-full font-semibold">
              📊 {currentQuestionIndex + 1}/{filteredQuestions.length}
            </div>
          </div>
        </div>
        <div className="mb-6">
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / filteredQuestions.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 leading-relaxed">
            {currentQuestion.question}
          </h2>
          {currentQuestion.type === 'mcq' && (
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(option)}
                  className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all duration-300 ${userAnswer === option
                      ? 'bg-blue-500 text-white shadow-lg transform scale-105'
                      : 'bg-white text-gray-700 hover:bg-blue-50 hover:scale-102 shadow-md'
                    }`}
                >
                  <span className="mr-3 text-gray-500 font-bold">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  {option}
                </button>
              ))}
            </div>
          )}
          {currentQuestion.type === 'trueFalse' && (
            <div className="flex gap-4">
              <button
                onClick={() => handleAnswer(true)}
                className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all duration-300 ${userAnswer === true
                    ? 'bg-green-500 text-white shadow-lg transform scale-105'
                    : 'bg-green-100 text-green-700 hover:bg-green-200 hover:scale-102'
                  }`}
              >
                ✅ True
              </button>
              <button
                onClick={() => handleAnswer(false)}
                className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all duration-300 ${userAnswer === false
                    ? 'bg-red-500 text-white shadow-lg transform scale-105'
                    : 'bg-red-100 text-red-700 hover:bg-red-200 hover:scale-102'
                  }`}
              >
                ❌ False
              </button>
            </div>
          )}
          {currentQuestion.type === 'fillInTheBlank' && (
            <div>
              <input
                type="text"
                value={userAnswer || ''}
                onChange={(e) => setUserAnswer(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 text-lg"
                placeholder="Type your answer here..."
              />
            </div>
          )}
          {currentQuestion.type === 'matchTheFollowing' && (
            <div className="space-y-3">
              {currentQuestion.pairs.map((pair, index) => (
                <div key={index} className="flex items-center gap-4 bg-white p-3 rounded-xl shadow-sm">
                  <div className="flex-1 font-medium text-gray-700">
                    {pair.question}
                  </div>
                  <div className="text-gray-500">→</div>
                  <select
                    onChange={(e) => handleAnswer({ question: pair.question, answer: e.target.value })}
                    className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
                  >
                    <option value="">Select answer...</option>
                    {currentQuestion.pairs.map((p, i) => (
                      <option key={i} value={p.answer}>{p.answer}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
        {(userAnswer !== null || (currentQuestion.type === 'matchTheFollowing' && Object.keys(matchAnswers).length === currentQuestion.pairs.length && Object.values(matchAnswers).every(val => val))) && (
          <div className="text-center mb-4">
            <button
              onClick={checkAnswer}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              🚀 Submit Answer
            </button>
          </div>
        )}
        {feedback && (
          <div className={`text-center p-4 rounded-xl font-bold text-lg ${feedback.includes('Correct') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
            {feedback}
          </div>
        )}
        <div className="text-center mt-6">
          <button
            onClick={goBackToCategorySelection}
            className="px-6 py-3 bg-gray-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            ⬅ Back to Category
          </button>
        </div>
      </div>
    </div>
  );
}

export default Quiz;