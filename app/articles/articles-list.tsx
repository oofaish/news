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
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [allPublications, setAllPublications] = useState<string[]>([]);
  const [selectedPublications, setSelectedPublications] = useState<string[]>(
    [],
  );
  const filters = [
    "New News",
    "Read and Unread News",
    "Saved",
    "Archived",
    "Down",
    "Up",
  ];

  const sorts = ["Top Score", "Newest"];

  const [filter, setFilter] = useState<string>(filters[1]);
  const [sort, setSort] = useState<string>(sorts[0]);
  const user = session?.user;

  const getArticles = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase.from("article").select(`*`);

      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 5);

      if (filter === "New News") {
        query = query.eq("archived", false).eq("read", false);
      }

      if (
        filter !== "Down" &&
        filter !== "Saved" &&
        filter !== "Up" &&
        filter !== "Archived"
      ) {
        query = query
          .gte("score", 0)
          .gte("published_at", twoDaysAgo.toISOString());
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

      if (sort === "Top Score") {
        query = query
          .order("score", { ascending: false })
          .order("published_at", { ascending: false });
      } else {
        query = query.order("published_at", { ascending: false });
      }
      let { data, error, status } = await query
        //.eq('user_id', user?.id)
        .limit(500);

      if (error && status !== 406) {
        throw error;
      }

      if (data) {
        // get unique publication names
        const publications = Array.from(
          new Set(data.map((article) => article.publication)),
        );
        // select publications not Guardian )copy first

        const initialSelection = publications.filter(
          (publication) => publication !== "Guardian",
        );
        setSelectedPublications(initialSelection);
        setAllPublications(publications);
        setArticles(
          data.filter((article) =>
            initialSelection.includes(article.publication),
          ),
        );
        setAllArticles(data);
      }
    } catch (error) {
      alert("Error loading articles data!");
    } finally {
      setLoading(false);
    }
  }, [supabase, filter, sort]);

  const handlePublicationChange = (event: any) => {
    const selected = Array.from(event.target.selectedOptions).map(
      (o: any) => o.value,
    );
    setSelectedPublications(selected);
    setArticles(
      allArticles.filter((article) => selected.includes(article.publication)),
    );
  };

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
        .filter((article) => {
          if (filter === "New News") {
            return !article.archived && !article.read;
          } else if (filter === "Read and Unread News") {
            // keep the updated article in unless it's been archive
            return (
              !article.archived ||
              (article.id == updatedArticle.id && !article.archived)
            );
          } else if (filter === "Saved") {
            return article.saved;
          } else if (filter === "Archived") {
            return article.archived;
          } else if (filter === "Down") {
            return article.score < 0;
          } else if (filter === "Up") {
            return article.score > 0;
          } else {
            return true;
          }
        }),
    );
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(e.target.value);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSort(e.target.value);
  };

  return (
    <div>
      <select onChange={handleFilterChange} value={filter}>
        {filters.map((filter) => (
          <option key={filter} value={filter}>
            {filter}
          </option>
        ))}
      </select>
      <select onChange={handleSortChange} value={sort}>
        {sorts.map((sort) => (
          <option key={sort} value={sort}>
            {sort}
          </option>
        ))}
      </select>

      <select
        multiple={true}
        value={selectedPublications}
        onChange={handlePublicationChange}
      >
        {allPublications.map((option) => (
          <option key={option} value={option}>
            {option}
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
