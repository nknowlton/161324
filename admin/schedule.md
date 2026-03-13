## 161.324 schedule

Week 1: Remembering what R is, ggplot, dplyr (select/mutate/summarise/filter/mutate/group_by), missingness?

 - Mostly from 122? Missingness could use school roll data?
 - Is there a problematic summary of school roll missing zeros?? Average number of males per school ignores zeros (group by school, gender, count students, group by gender, average - won't count single-gender schools.)
 - Lecture does what is data mining, dplyr basics.

Week 2: Data wrangling: Getting data into R, pivoting, joining, facetting.

 - MoH immunisation data (excel nastiness. Need to pivot).
 - COVID-19 vaccination data (long and tidy (though unknown sa2), weirdness in >950 rates, first sheet can talk about pseudo-absences of counts, joining to other tables.
 - Fix missingness in school roll data?
 - LAWA data?
 - Lecture does tidy data, joining, facetting/patchwork/layering etc?

<Test 1 goes here>

Week 3: Missing value imputation

 - Visualising missingness
 - Imputation example of mean vs k-nn???

Week 4: Prediction: Linear model.

 - lab5.tex has some ancient stuff. Need another example.

Week 5: Prediction: Regression trees, comparison with LM.

 - lab6.tex has some ancient stuff. Need another example.

<Assignment 1 Due Start of week 5>

Week 6: Prediction: Random forests, Neural nets?

 - lab6.tex has some NN stuff. Need another example.
 - We do have the prediction bank one from contact course.

Week 7: Classification: (LDA, NB, KDA)

<Test 1: Material up to week 6>

Week 8: Classification: (Logistic regression, Lasso.)

Week 9: Classification: (Trees, Forests, light on Neural Nets)

** Nick takes over here **

## Week 10: Boosting, Bagging, XGBoost, AutoML

### Lecture focus
- Bagging as an extension of tree based modelling
- Why bagging reduces variance and improves stability
- Boosting as sequential error correction
- Conceptual difference between bagging and boosting
- Gradient boosting intuition
- XGBoost as a practical high performance boosting framework
- Comparing single trees, random forests, and boosted trees
- Trade off between predictive performance and interpretability
- Cross validation and tuning for ensemble methods
- AutoML as a structured workflow for model comparison, tuning, and selection
- Limits of AutoML and the continued need for human judgement

<Assignment 2 (Prediction, Classification) due end of week 11/start of week 12?>

## Week 11: Clustering

### Lecture focus
- Clustering as unsupervised learning
- Difference between supervised and unsupervised tasks
- Similarity and distance measures
- Importance of scaling before clustering
- Hierarchical clustering and dendrogram interpretation
- Agglomerative clustering logic
- K-means clustering and centroid based partitioning
- K-medoids as a more robust alternative to K-means
- Choosing the number of clusters
- Interpreting clusters cautiously in applied settings
- Sensitivity of clustering results to scaling, outliers, and variable choice

## Week 12: Market Basket Analysis

### Lecture focus
- Association rule mining as pattern discovery in transactional data
- Structure of transaction data
- Frequent itemsets
- Support, confidence, and lift
- Apriori algorithm intuition
- How to interpret association rules
- Difference between common rules and informative rules
- Filtering rules by usefulness and redundancy
- Practical applications of market basket analysis
- Limitations of association rules for causal interpretation


- Brief Review or Table of supervised learning, unsupervised learning, and association pattern mining





<Test 2, end of week 12: material on weeks 7-11>

<Assignment 3, due start of week 13>
