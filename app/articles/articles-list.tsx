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

let getQuery = (
  supabase: SupabaseClient,
  sort: string,
  filter: string,
  publicationFilter: string[],
) => {
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
    query = query.gte("score", -6).gte("published_at", cutOff.toISOString());
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

  if (publicationFilter && publicationFilter.length > 0) {
    query = query.in("publication", publicationFilter);
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

  const [selectedTagsScope, setSelectedTagsScope] = useState<string[]>(() => {
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem("selectedTagsScope")
        : null;
    return saved !== null ? JSON.parse(saved) : [];
  });
  const [selectedTagsMood, setSelectedTagsMood] = useState<string[]>(() => {
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem("selectedTagsMood")
        : null;
    return saved !== null ? JSON.parse(saved) : [];
  });
  const [selectedTagsTopic, setSelectedTagsTopic] = useState<string[]>(() => {
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem("selectedTagsTopic")
        : null;
    return saved !== null ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const fetchPublications = async () => {
      try {
        const { data, error } = await supabase
          .from("recent_publications")
          .select("publication");

        if (error) throw error;

        if (data) {
          const publications = data.map((item: any) => item["publication"]);
          setAllPublications(publications);

          // If no publications are selected, select all by default
          if (selectedPublications.length === 0) {
            setSelectedPublications(publications);
          }
        }
      } catch (error) {
        console.error("Error fetching publications:", error);
      }
    };

    fetchPublications();
  }, [supabase]);

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

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "selectedTagsScope",
        JSON.stringify(selectedTagsScope),
      );
    }
  }, [selectedTagsScope]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "selectedTagsMood",
        JSON.stringify(selectedTagsMood),
      );
    }
  }, [selectedTagsMood]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "selectedTagsTopic",
        JSON.stringify(selectedTagsTopic),
      );
    }
  }, [selectedTagsTopic]);

  const handlePublicationChange = (event: any) => {
    const selected = Array.from(event.target.selectedOptions).map(
      (o: any) => o.value,
    );
    setArticles([]);
    setSelectedPublications(selected);
    // setArticles(
    //   allArticles.filter((article) => selected.includes(article.publication)),
    // );
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
      let query = getQuery(supabase, sort, filter, selectedPublications);

      query = query.range(
        currentPage * DEFAULT_ARTICLES_PER_PAGE,
        (currentPage + 1) * DEFAULT_ARTICLES_PER_PAGE - 1,
      );

      let { data, error, status } = await query;

      if (error && status !== 406) {
        throw error;
      }

      if (data) {
        // Create a map of existing article IDs to avoid duplicates
        const existingArticleIds = new Set(
          articles.map((article) => article.id),
        );

        // Filter out any articles that we already have
        const newArticles = data.filter(
          (article) => !existingArticleIds.has(article.id),
        );

        const newAndOldArticles = [...articles, ...newArticles];

        setArticles(
          newAndOldArticles.filter(
            (article) =>
              selectedPublications.length == 0 ||
              selectedPublications.includes(article.publication),
          ),
        );

        setCurrentPage(currentPage + 1);

        setAllArticles(newAndOldArticles);
      }
    } catch (error) {
      console.error("Error loading more articles:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, articles, currentPage, filter, sort, selectedPublications]);

  useEffect(() => {
    // added this setArticle as without it we end up duplicating articles.
    setArticles([]);
    setCurrentPage(0);
  }, [sort, filter, selectedPublications]);

  useEffect(() => {
    if (currentPage === 0) {
      // setArticles([]);
      loadMoreArticles();
    }
  }, [currentPage]); //, initialLoadDone]);

  const refreshPage = () => {
    setArticles([]);
    setCurrentPage(0);
    loadMoreArticles();
  };

  const uniqueTagsScope = Array.from(
    new Set(allArticles.flatMap((article) => article.tags_scope || [])),
  );
  const uniqueTagsMood = Array.from(
    new Set(allArticles.flatMap((article) => article.tags_mood || [])),
  );
  const uniqueTagsTopic = Array.from(
    new Set(allArticles.flatMap((article) => article.tags_topic || [])),
  );

  useEffect(() => {
    setArticles(
      allArticles.filter((article) => {
        const matchesScope =
          selectedTagsScope.length === 0 ||
          selectedTagsScope.some((tag) => article.tags_scope?.includes(tag));
        const matchesMood =
          selectedTagsMood.length === 0 ||
          selectedTagsMood.some((tag) => article.tags_mood?.includes(tag));
        const matchesTopic =
          selectedTagsTopic.length === 0 ||
          selectedTagsTopic.some((tag) => article.tags_topic?.includes(tag));
        return matchesScope && matchesMood && matchesTopic;
      }),
    );
  }, [selectedTagsScope, selectedTagsMood, selectedTagsTopic, allArticles]);

  const handleTagsScopeChange = (event: any) => {
    const selected = Array.from(event.target.selectedOptions).map(
      (o: any) => o.value,
    );
    setSelectedTagsScope(selected);
  };

  const handleTagsMoodChange = (event: any) => {
    const selected = Array.from(event.target.selectedOptions).map(
      (o: any) => o.value,
    );
    setSelectedTagsMood(selected);
  };

  const handleTagsTopicChange = (event: any) => {
    const selected = Array.from(event.target.selectedOptions).map(
      (o: any) => o.value,
    );
    setSelectedTagsTopic(selected);
  };

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
        <button className="refresh button" onClick={refreshPage}>
          Refresh
        </button>
      </div>
      <div className="filters">
        <select
          multiple
          value={selectedTagsScope}
          onChange={handleTagsScopeChange}
        >
          {uniqueTagsScope.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
        <select
          multiple
          value={selectedTagsMood}
          onChange={handleTagsMoodChange}
        >
          {uniqueTagsMood.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
        <select
          multiple
          value={selectedTagsTopic}
          onChange={handleTagsTopicChange}
        >
          {uniqueTagsTopic.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
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
        <form action="/auth/signout" method="post">
          <button className="signout button" type="submit">
            Sign out
          </button>
        </form>
      </div>
      {/* <div className="load-more-trigger"></div> */}
    </div>
  );
}
