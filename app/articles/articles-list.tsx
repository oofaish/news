"use client";
import { useCallback, useEffect, useState } from "react";
import { Database, Article } from "../database.types";
import {
  Session,
  createClientComponentClient,
  SupabaseClient,
} from "@supabase/auth-helpers-nextjs";
import ArticleRow from "./article-row";

const DEFAULT_ARTICLES_PER_PAGE = 100;

let getQuery = (supabase: SupabaseClient, sort: string, filter: string) => {
  let query = supabase.from("article").select(`*`);

  const cutOff = new Date();
  cutOff.setDate(cutOff.getDate() - (sort === "Top Score" ? 2 : 5));

  if (filter === "New News") {
    query = query.eq("archived", false).eq("read", false);
  }

  if (
    filter !== "Down" &&
    filter !== "Saved" &&
    filter !== "Up" &&
    filter !== "Archived"
  ) {
    // show some of the negative scores too - just to see what we are missing out on
    query = query.gte("score", -8).gte("published_at", cutOff.toISOString());
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

  return query;
};

export default function ArticleList({ session }: { session: Session | null }) {
  const supabase = createClientComponentClient<Database>();

  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [allPublications, setAllPublications] = useState<string[]>([]);
  const [selectedPublications, setSelectedPublications] = useState<string[]>(
    () => {
      const saved =
        typeof window !== "undefined"
          ? localStorage.getItem("selectedPublications")
          : null;
      return saved !== null ? JSON.parse(saved) : [];
    },
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

  const [filter, setFilter] = useState<string>(() => {
    const saved =
      typeof window !== "undefined" ? localStorage.getItem("filter") : null;
    return saved !== null ? JSON.parse(saved) : filters[1];
  });
  const [sort, setSort] = useState<string>(() => {
    const saved =
      typeof window !== "undefined" ? localStorage.getItem("sort") : null;
    return saved !== null ? JSON.parse(saved) : sorts[0];
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sort", JSON.stringify(sort));
    }
  }, [sort]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("filter", JSON.stringify(filter));
    }
  }, [filter]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "selectedPublications",
        JSON.stringify(selectedPublications),
      );
    }
  }, [selectedPublications]);

  const user = session?.user;

  const handlePublicationChange = (event: any) => {
    const selected = Array.from(event.target.selectedOptions).map(
      (o: any) => o.value,
    );
    setSelectedPublications(selected);
    setArticles(
      allArticles.filter((article) => selected.includes(article.publication)),
    );
  };

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
            return true;
          } else if (filter === "Archived") {
            return true;
          } else if (filter === "Down") {
            return article.score < 20;
          } else if (filter === "Up") {
            return article.score > -20;
          } else {
            return true;
          }
        }),
    );
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setArticles([]);
    setFilter(e.target.value);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setArticles([]);
    setSort(e.target.value);
  };

  const loadMoreArticles = useCallback(async () => {
    try {
      setLoading(true);
      let query = getQuery(supabase, sort, filter);

      query = query.range(
        currentPage * DEFAULT_ARTICLES_PER_PAGE,
        (currentPage + 1) * DEFAULT_ARTICLES_PER_PAGE - 1,
      );

      let { data, error, status } = await query;

      if (error && status !== 406) {
        throw error;
      }

      if (data) {
        const newAndOldArticles = [...articles, ...data];
        // get unique publication names
        const newlyAppearingPublications = Array.from(
          new Set(data.map((article) => article.publication)),
        );

        const newPublications = Array.from(
          new Set([...newlyAppearingPublications, ...allPublications]),
        );
        newPublications.sort();

        // if all publications are selected, then select all new publications
        if (allPublications.length === selectedPublications.length) {
          setSelectedPublications(newPublications);
        }

        setArticles(
          newAndOldArticles.filter(
            (article) =>
              selectedPublications.length == 0 ||
              selectedPublications.includes(article.publication),
          ),
        );

        setCurrentPage(currentPage + 1);

        setAllPublications(newPublications);
        setAllArticles(newAndOldArticles);
      }
    } catch (error) {
      console.error("Error loading more articles:", error);
    } finally {
      setLoading(false);
    }
  }, [
    supabase,
    articles,
    currentPage,
    filter,
    sort,
    allPublications,
    selectedPublications,
  ]);

  useEffect(() => {
    setCurrentPage(0);
  }, [sort, filter, user]);

  useEffect(() => {
    if (currentPage === 0) {
      // setArticles([]);
      loadMoreArticles();
    }
  }, [currentPage]); //, initialLoadDone]);

  // useEffect(() => {
  //   const loadMoreTrigger = document.querySelector(".load-more-trigger");
  //   if (initialLoadDone) {
  //     if (loadMoreTrigger) {
  //       const observer = new IntersectionObserver(
  //         (entries) => {
  //           if (entries[0].isIntersecting) {
  //             loadMoreArticles();
  //           }
  //         },
  //         { threshold: 1.0 },
  //       );

  //       observer.observe(loadMoreTrigger);

  //       // Clean up function
  //       return () => observer.disconnect();
  //     }
  //   }
  // }, [loadMoreArticles]);

  return (
    <div>
      <div className="flex-container">
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
        <form action="/auth/signout" method="post">
          <button className="signout button" type="submit">
            Sign out
          </button>
        </form>
      </div>

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
        <button onClick={loadMoreArticles} disabled={loading}>
          {loading ? "Loading..." : "Load More"}
        </button>
      </div>
      {/* <div className="load-more-trigger"></div> */}
    </div>
  );
}
