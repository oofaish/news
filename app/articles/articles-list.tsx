"use client";
import { useCallback, useEffect, useState } from "react";
import { Database, Article } from "../database.types";
import {
  Session,
  createClientComponentClient,
} from "@supabase/auth-helpers-nextjs";
import ArticleRow from "./article-row";

export default function ArticleList({ session }: { session: Session | null }) {
  const supabase = createClientComponentClient<Database>();
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);
  const [filter, setFilter] = useState<string>("Read and Unread News");
  const user = session?.user;
  const filters = [
    "New News",
    "Read and Unread News",
    "Saved",
    "Archived",
    "Down",
    "Up",
  ];

  const getArticles = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase.from("article").select(`*`);

      if (filter === "New News") {
        query = query.eq("archived", false).eq("read", false).gte("score", 0);
      }

      if (filter !== "Down" && filter !== "Saved" && filter !== "Up") {
        query = query.gte("score", 0);
      }

      if (filter === "Read and Unread News") {
        query = query.eq("archived", false);
      } else if (filter === "Saved") {
        query = query.eq("saved", true);
      } else if (filter === "Archived") {
        query = query.eq("archived", true);
      } else if (filter === "Down") {
        query = query.lt("score", 0);
      } else if (filter === "Up") {
        query = query.gt("score", 0);
      }

      let { data, error, status } = await query
        .order("published_at", { ascending: false })
        //.eq('user_id', user?.id)
        .limit(200);

      if (error && status !== 406) {
        throw error;
      }

      if (data) {
        setArticles(data);
      }
    } catch (error) {
      alert("Error loading articles data!");
    } finally {
      setLoading(false);
    }
  }, [supabase, filter]);

  useEffect(() => {
    getArticles();
  }, [user, getArticles]);

  const updateArticle = (updatedArticle: Article) => {
    setArticles((prevArticles) =>
      prevArticles
        .map(
          (article) =>
            article.id === updatedArticle.id ? updatedArticle : article,
          // this filters are not acting as you might expect - but I *think* I like the current
          // behaviour - will have to come and revisit.
        )
        .filter(
          (article) =>
            filter === "Down" || filter === "Saved" || article.score >= 0,
        )
        .filter(
          (article) => filter === "Archived" || article.archived === false,
        ),
    );
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(e.target.value);
  };
  if (articles !== null && articles.length > 0) {
    console.log(articles[0]);
  }

  return (
    <div>
      <select onChange={handleFilterChange} value={filter}>
        {filters.map((filter) => (
          <option key={filter} value={filter}>
            {filter}
          </option>
        ))}
      </select>

      <div className="articles-list">
        {articles.map((article) => (
          <ArticleRow
            key={article.id}
            article={article}
            onUpdate={updateArticle}
          />
        ))}
      </div>
      <div>
        <form action="/auth/signout" method="post">
          <button className="signout button block" type="submit">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
