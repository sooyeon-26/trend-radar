import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./App.css";

function App() {
  const [trends, setTrends] = useState([]);
  const [keyword, setKeyword] = useState("AI");
  const [trendHistory, setTrendHistory] = useState([]);

  useEffect(() => {
    axios
      .get("http://localhost:4000/api/trends/top")
      .then((response) => {
        setTrends(response.data);
      })
      .catch((error) => {
        console.error("트렌드 데이터 조회 실패:", error);
      });
  }, []);

  useEffect(() => {
    fetchKeywordTrend("AI");
  }, []);

  const fetchKeywordTrend = (searchKeyword) => {
    axios
      .get(`http://localhost:4000/api/trends/${searchKeyword}`)
      .then((response) => {
        setTrendHistory(response.data);
      })
      .catch((error) => {
        console.error("키워드 트렌드 조회 실패:", error);
      });
  };

  const handleSearch = (event) => {
    event.preventDefault();

    if (!keyword.trim()) {
      return;
    }

    fetchKeywordTrend(keyword.trim());
  };

  return (
    <main className="app">
      <h1>Trend Radar</h1>

      <section className="panel">
        <h2>오늘의 인기 키워드 TOP 10</h2>

        <ol className="trend-list">
          {trends.map((trend) => (
            <li key={trend._id} className="trend-item">
              <span>{trend.keyword}</span>
              <strong>{trend.count}건</strong>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel">
        <h2>키워드 검색</h2>

        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="text"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="예: AI"
          />
          <button type="submit">검색</button>
        </form>

        <div className="chart-box">
          {trendHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#2563eb"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty-message">검색 결과가 없습니다.</p>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
